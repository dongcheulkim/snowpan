// 매장 정보 보강 — 전화·주소·지도 링크가 빈 매장을 네이버 지역검색으로 채운다 (2026-10-02, 사장님 "매장 전화·주소 자동 보강").
// 상호가 일치하고(공백·괄호 제거 후 포함 관계) 지역이 맞는 결과만 쓴다. 기존 값은 절대 덮어쓰지 않고 빈 칸만 채움. dryRun 이면 계획만 돌려줌.
// 네이버 지역검색엔 영업시간이 없고 전화도 자주 비어 있어, 주로 주소·지도 링크가 채워진다.
import prisma from '../config/database';
import { naverConfigured, naverLocalSearch, type NaverPlace } from './naverSearch';

// 2차 소스: 카카오 로컬 키워드 검색 — 네이버와 달리 전화번호(phone)를 돌려준다. 키는 지오코딩과 같은 KAKAO_REST_API_KEY.
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY || '';
async function kakaoKeyword(query: string): Promise<NaverPlace[]> {
  if (!KAKAO_KEY) return [];
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json() as { documents?: { place_name: string; phone: string; address_name: string; road_address_name: string; category_name: string }[] };
    return (data.documents || []).map((d) => ({ title: d.place_name, telephone: d.phone || '', address: d.address_name || '', roadAddress: d.road_address_name || '', category: d.category_name || '' }));
  } catch { return []; }
}

type Kind = 'skishop' | 'repair' | 'rental';
export interface EnrichPlan { kind: Kind; id: string; name: string; fill: Record<string, string>; from: string }
export interface EnrichReport { configured: boolean; dryRun: boolean; scanned: number; matched: number; applied: number; noFill: number; plan: EnrichPlan[]; unmatched: string[]; noFillSample: string[] }

const strip = (s: string | null | undefined) => (s || '').replace(/<[^>]+>/g, '').replace(/[\s\-()·・.,]/g, '').toLowerCase();
const REGION: Record<string, string[]> = { '강원': ['강원'], '경기': ['경기'], '서울': ['서울'], '충청': ['충청', '충북', '충남', '대전', '세종'], '전북': ['전북', '전라북도'], '전남': ['전남', '전라남도', '광주'], '경북': ['경북', '경상북도', '대구'], '경남': ['경남', '경상남도', '부산', '울산'], '제주': ['제주'] };

// 시·군·구 토큰 비교 — '강원특별자치도 평창군 …'(우리) vs '강원 평창군 …'(카카오) 처럼 도 표기가 달라도 군·구가 같으면 같은 지역으로 본다
const CITY_RE = /[가-힣]{1,6}(?:시|군|구)(?=\s|$)/g;
function cityTokens(addr: string): Set<string> { return new Set((addr.match(CITY_RE) || []).map((t) => t.replace(/^(강원특별자치도|전북특별자치도|제주특별자치도)/, ''))); }
function sameArea(a: string, b: string): boolean {
  const ta = cityTokens(a), tb = cityTokens(b);
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}
function pick(shop: { name: string; address?: string | null; area?: string | null }, places: NaverPlace[]): NaverPlace | null {
  const n = strip(shop.name);
  const want = REGION[shop.area || ''] || (shop.area ? [shop.area] : []);
  for (const p of places) {
    const pn = strip(p.title);
    if (!pn || !n || !(pn.includes(n) || n.includes(pn))) continue;
    const addr = `${p.roadAddress} ${p.address}`;
    if (shop.address) { if (!sameArea(shop.address, addr)) continue; }
    else if (want.length && !want.some((w) => addr.includes(w))) continue;
    return p;
  }
  return null;
}

export async function enrichShops(dryRun = true, limit = 700): Promise<EnrichReport> {
  const report: EnrichReport = { configured: naverConfigured() || Boolean(KAKAO_KEY), dryRun, scanned: 0, matched: 0, applied: 0, noFill: 0, plan: [], unmatched: [], noFillSample: [] };
  if (!report.configured) return report;
  const sel = { id: true, name: true, phone: true, address: true, area: true, naverMap: true, website: true, resort: { select: { name: true } } } as const;
  const need = (s: { phone?: string | null; address?: string | null; naverMap?: string | null }) => !s.phone || !s.address || !s.naverMap;
  const groups: { kind: Kind; rows: { id: string; name: string; phone: string | null; address: string | null; area: string | null; naverMap: string | null; website: string | null; resort: { name: string } | null }[] }[] = [
    { kind: 'skishop', rows: (await prisma.skiShop.findMany({ where: { approved: true }, select: sel })).filter(need) },
    { kind: 'repair', rows: (await prisma.repairShop.findMany({ where: { approved: true }, select: sel })).filter(need) },
    { kind: 'rental', rows: (await prisma.rental.findMany({ where: { approved: true }, select: sel })).filter(need) },
  ];
  for (const g of groups) for (const s of g.rows) {
    if (report.scanned >= limit) break;
    report.scanned++;
    const q = `${s.name} ${s.resort?.name || s.area || ''}`.trim();
    let places = await naverLocalSearch(q);
    if (!places.length && s.resort?.name) places = await naverLocalSearch(`${s.name} ${s.area || ''}`.trim());
    let p = pick(s, places); let src = 'naver';
    // 네이버에 없거나 전화가 비어 있으면 카카오로 한 번 더 (전화는 카카오가 거의 유일한 공개 소스)
    if (!p || (!s.phone && !(p.telephone || '').trim())) {
      const kp = pick(s, await kakaoKeyword(q)) || (s.resort?.name ? pick(s, await kakaoKeyword(`${s.name} ${s.area || ''}`.trim())) : null);
      if (kp && (!p || (kp.telephone || '').trim())) { p = kp; src = 'kakao'; }
    }
    if (!p) { report.unmatched.push(`${g.kind}:${s.name}`); continue; }
    const fill: Record<string, string> = {};
    const tel = (p.telephone || '').trim();
    if (!s.phone && /^\d[\d-]{7,}$/.test(tel)) fill.phone = tel;
    const addr = (p.roadAddress || p.address || '').trim();
    if (!s.address && addr) fill.address = addr;
    if (!s.naverMap) fill.naverMap = `https://map.naver.com/p/search/${encodeURIComponent(`${p.title.replace(/<[^>]+>/g, '')} ${addr}`.trim())}`;
    if (!Object.keys(fill).length) { report.noFill++; if (report.noFillSample.length < 8) report.noFillSample.push(`${g.kind}:${s.name} ← [${src}] ${p.title.replace(/<[^>]+>/g, '')} tel='${(p.telephone || '').trim()}' phoneHave=${Boolean(s.phone)} addrHave=${Boolean(s.address)} mapHave=${Boolean(s.naverMap)}`); continue; }
    report.matched++;
    report.plan.push({ kind: g.kind, id: s.id, name: s.name, fill, from: `[${src}] ${p.title.replace(/<[^>]+>/g, '')} · ${addr}` });
    if (!dryRun) {
      const delegate = g.kind === 'skishop' ? prisma.skiShop : g.kind === 'repair' ? prisma.repairShop : prisma.rental;
      await (delegate as unknown as { update: (a: { where: { id: string }; data: Record<string, string> }) => Promise<unknown> }).update({ where: { id: s.id }, data: fill });
      report.applied++;
    }
    await new Promise((r) => setTimeout(r, 120)); // 네이버 초당 제한 여유
  }
  return report;
}
