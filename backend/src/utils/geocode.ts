// 주소 → 좌표 (카카오 로컬 API). 카카오 로그인용 REST 키(KAKAO_CLIENT_ID)를 그대로 쓴다 (별도 키 KAKAO_REST_API_KEY 있으면 우선).
// 키가 없으면 조용히 null — 좌표 없는 매장은 '내 주변' 거리만 안 보일 뿐 나머지 기능은 그대로.
import prisma from '../config/database';

const KEY = process.env.KAKAO_REST_API_KEY || process.env.KAKAO_CLIENT_ID || '';
export function geocodeConfigured(): boolean { return Boolean(KEY); }

export interface LatLng { lat: number; lng: number }

async function kakao(url: string): Promise<LatLng | null> {
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const d = await r.json() as { documents?: { x?: string; y?: string }[] };
  const doc = d?.documents?.[0];
  if (!doc) return null;
  const lat = parseFloat(doc.y || ''), lng = parseFloat(doc.x || '');
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// 1) 주소 검색 (정확) → 2) 번지까지만 잘라 주소 검색 (뒤에 건물명·층이 붙은 경우) → 3) 키워드 검색 (최후)
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!KEY) return null;
  const q = (address || '').trim().replace(/\s+/g, ' ');
  if (q.length < 5) return null;
  const short = q.match(/^(.*?\d+(?:-\d+)?)(?:\s|$)/)?.[1];
  try {
    return (await kakao(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`))
      || (short && short !== q ? await kakao(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(short)}`) : null)
      || (await kakao(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`));
  } catch {
    return null;
  }
}

// 진단용 — 카카오 응답 상태/본문을 그대로 (키 미활성화 등 원인 파악). 관리자 백필 API 의 debug 옵션에서만 사용.
export async function geocodeDebug(address: string): Promise<{ status: number; body: string; keyConfigured: boolean }> {
  if (!KEY) return { status: 0, body: 'no key', keyConfigured: false };
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, { headers: { Authorization: `KakaoAK ${KEY}` }, signal: AbortSignal.timeout(6000) });
  return { status: r.status, body: (await r.text()).slice(0, 400), keyConfigured: true };
}

// 카카오 키워드 검색 (리조트처럼 이름으로 찾을 때). 결과 주소에 expectRegion(예: '평창군')이 들어 있어야 채택.
export async function geocodeKeyword(keyword: string, expectRegion?: string): Promise<(LatLng & { address: string }) | null> {
  if (!KEY) return null;
  try {
    const r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=5`, { headers: { Authorization: `KakaoAK ${KEY}` }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json() as { documents?: { x?: string; y?: string; address_name?: string; road_address_name?: string }[] };
    for (const doc of d?.documents || []) {
      const addr = doc.road_address_name || doc.address_name || '';
      if (expectRegion && !addr.includes(expectRegion)) continue;
      const lat = parseFloat(doc.y || ''), lng = parseFloat(doc.x || '');
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, address: addr };
    }
  } catch { /* 실패 시 null */ }
  return null;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 리조트 반경(기본 12km) 안이면 가장 가까운 리조트 id — 주소만으로 등록한 매장을 리조트 필터에 자동 포함시키기 위함
export const RESORT_LINK_KM = Number(process.env.RESORT_LINK_KM || 12); // 사용자 결정: 12km 까지 리조트 소속으로
export async function nearestResortId(p: LatLng, maxKm = RESORT_LINK_KM): Promise<string | null> {
  const resorts = await prisma.skiResort.findMany({ where: { lat: { not: null }, lng: { not: null } }, select: { id: true, lat: true, lng: true } });
  let best: { id: string; d: number } | null = null;
  for (const r of resorts) {
    const d = distanceKm(p, { lat: r.lat as number, lng: r.lng as number });
    if (d <= maxKm && (!best || d < best.d)) best = { id: r.id, d };
  }
  return best?.id ?? null;
}

export type GeoShopKind = 'skishop' | 'repair' | 'rental';

// 등록·수정 직후 fire-and-forget 으로 좌표 저장 (실패해도 응답엔 영향 없음)
export async function geocodeAndStore(kind: GeoShopKind, id: string, address?: string | null): Promise<boolean> {
  const c = await geocodeAddress(address || '');
  if (!c) return false;
  const delegate = kind === 'skishop' ? prisma.skiShop : kind === 'repair' ? prisma.repairShop : prisma.rental;
  // 리조트를 안 고른 매장은 좌표 기준으로 가까운 리조트(반경 내)에 자동 연결 — "휘닉스 동네면 휘닉스 안에 보여야" (사용자 요구)
  const cur = await (delegate as typeof prisma.rental).findUnique({ where: { id }, select: { resortId: true } });
  const data: { lat: number; lng: number; resortId?: string } = { lat: c.lat, lng: c.lng };
  if (cur && !cur.resortId) {
    const rid = await nearestResortId(c);
    if (rid) data.resortId = rid;
  }
  await (delegate as typeof prisma.rental).update({ where: { id }, data });
  return true;
}
