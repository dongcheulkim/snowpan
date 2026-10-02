// 외부 링크·이미지·웹캠 스트림 자동 점검 (2026-10-02, 사장님 "왜 이런 건 사전에 검사 안 하냐").
// 매일 04시 KST 에 사이트에 걸린 모든 외부 주소를 열어 보고 결과를 AdminSetting(link_health_last) 에 저장, 새로 죽은 게 생기면 관리자 알림·푸시.
// 판정: dead = DNS 실패·404/410·TLS 오류, blocked = 403/429/406/401/405(봇 차단, 브라우저에선 열림), ok = 2xx/3xx, unknown = 타임아웃.
import prisma from '../config/database';
import { probeStream } from './webcamLive';
import { notifyAdmins } from '../controllers/notificationController';

export type Target = { kind: 'link' | 'image' | 'stream'; src: string; label: string; url: string; fixPath?: string };
export type Result = Target & { status: 'ok' | 'dead' | 'blocked' | 'unknown'; code: number | string };
export interface HealthReport {
  ranAt: string; durationMs: number;
  total: { links: number; images: number; streams: number };
  dead: Result[]; blocked: Result[]; offlineStreams: Result[]; unknown: Result[];
}

const KEY = 'link_health_last';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';

function idna(u: string): string {
  try { const x = new URL(u); return x.href; } catch { return u; } // WHATWG URL 이 한글 도메인을 punycode 로 바꿔 줌
}
function splitImgs(v: string | null | undefined): string[] {
  return String(v || '').split(',').map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
}

export async function collectTargets(): Promise<Target[]> {
  const t: Target[] = [];
  const add = (kind: Target['kind'], src: string, label: string, url: string | null | undefined, fixPath?: string) => {
    if (url && /^https?:\/\//.test(url)) t.push({ kind, src, label, url, fixPath });
  };
  const resorts = await prisma.overseasResort.findMany({ where: { published: true }, select: { id: true, name: true, website: true, webcamUrl: true, image: true } });
  for (const r of resorts) { add('link', '스키장 투어 홈페이지', r.name, r.website, `/admin#overseas:${r.id}`); add('link', '스키장 투어 웹캠', r.name, r.webcamUrl, `/admin#overseas:${r.id}`); add('image', '스키장 투어 사진', r.name, r.image); }
  const deals = await prisma.overseasDeal.findMany({ where: { active: true }, select: { id: true, title: true, link: true, image: true } });
  for (const d of deals) { add('link', '여행 상품', d.title, d.link); add('image', '여행 상품 사진', d.title, d.image); }
  const agencies = await prisma.travelAgency.findMany({ where: { approved: true }, select: { name: true, website: true, image: true } });
  for (const a of agencies) { add('link', '여행사', a.name, a.website); add('image', '여행사 사진', a.name, a.image); }
  const shops: { src: string; rows: { id: string; name: string; website?: string | null; image?: string | null; images?: string | null }[]; path: string }[] = [
    { src: '스키샵', rows: await prisma.skiShop.findMany({ where: { approved: true }, select: { id: true, name: true, website: true, image: true, images: true } }), path: '/skishop' },
    { src: '정비샵', rows: await prisma.repairShop.findMany({ where: { approved: true }, select: { id: true, name: true, website: true, image: true, images: true } }), path: '/repair' },
    { src: '렌탈샵', rows: await prisma.rental.findMany({ where: { approved: true }, select: { id: true, name: true, website: true, image: true, images: true } }), path: '/rental' },
    { src: '레슨', rows: await prisma.lesson.findMany({ where: { approved: true }, select: { id: true, name: true, image: true, images: true } }), path: '/lesson' },
    { src: '숙소', rows: await prisma.accommodation.findMany({ where: { approved: true }, select: { id: true, name: true, image: true, images: true } }), path: '/accommodation' },
  ];
  for (const g of shops) for (const s of g.rows) {
    add('link', `${g.src} 홈페이지`, s.name, s.website, `${g.path}/${s.id}`);
    for (const u of [s.image, ...splitImgs(s.images)]) if (u && !/picsum\.photos/.test(u)) add('image', `${g.src} 사진`, s.name, u, `${g.path}/${s.id}`);
  }
  const products = await prisma.product.findMany({ where: { deletedAt: null, status: { not: 'sold' } }, orderBy: { createdAt: 'desc' }, take: 300, select: { id: true, name: true, image: true, images: true } });
  for (const p of products) for (const u of [p.image, ...splitImgs(p.images)]) add('image', '중고 매물 사진', p.name, u, `/used/${p.id}`);
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, images: true } });
  for (const p of posts) for (const u of splitImgs(p.images)) add('image', '커뮤니티 사진', p.title, u, `/community/${p.id}`);
  const banners = await prisma.banner.findMany({ where: { active: true }, select: { title: true, url: true, image: true } });
  for (const b of banners) { add('link', '배너 링크', b.title, b.url); add('image', '배너 사진', b.title, b.image); }
  const cams = await prisma.webcam.findMany({ where: { active: true }, select: { slug: true, name: true, externalUrl: true, cameras: true } });
  for (const c of cams) {
    add('link', '국내 웹캠 공식 페이지', c.name, c.externalUrl, `/webcam/${c.slug}`);
    for (const cam of (Array.isArray(c.cameras) ? (c.cameras as { label: string; stream: string }[]) : [])) add('stream', '국내 웹캠 스트림', `${c.name} · ${cam.label}`, cam.stream, `/webcam/${c.slug}`);
  }
  // 중복 제거
  const seen = new Set<string>();
  return t.filter((x) => { const k = x.kind + x.url; if (seen.has(k)) return false; seen.add(k); return true; });
}

async function fetchStatus(url: string, method: 'HEAD' | 'GET', extra?: Record<string, string>): Promise<{ code: number | string; type: string }> {
  try {
    const res = await fetch(idna(url), { method, redirect: 'follow', signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': UA, 'Accept-Language': 'ko,en;q=0.8', ...(extra || {}) } });
    if (method === 'GET') { try { await res.body?.cancel(); } catch { /* ignore */ } }
    return { code: res.status, type: res.headers.get('content-type') || '' };
  } catch (e) {
    const msg = String((e as Error)?.message || e); const cause = String((e as { cause?: { code?: string } })?.cause?.code || '');
    if (/ENOTFOUND|EAI_AGAIN/.test(cause) || /ENOTFOUND|getaddrinfo/.test(msg)) return { code: 'DNS', type: '' };
    if (/CERT|TLS|SSL|EPROTO/i.test(cause + msg)) return { code: 'TLS', type: '' };
    if (/timeout|aborted/i.test(msg)) return { code: 'TIMEOUT', type: '' };
    return { code: 'ERR', type: '' };
  }
}

export async function checkTarget(t: Target): Promise<Result> {
  if (t.kind === 'stream') {
    const live = await probeStream(t.url);
    return { ...t, status: live === true ? 'ok' : live === false ? 'dead' : 'unknown', code: live === null ? 'n/a' : live ? 200 : 'off' };
  }
  if (t.kind === 'image') {
    const r = await fetchStatus(t.url + (t.url.includes('?') ? '&' : '?') + 'width=200', 'HEAD');
    const r2 = r.code === 405 || r.code === 403 ? await fetchStatus(t.url, 'GET', { Range: 'bytes=0-512' }) : r;
    const ok = typeof r2.code === 'number' && r2.code >= 200 && r2.code < 400 && (!r2.type || /^image\//.test(r2.type));
    return { ...t, status: ok ? 'ok' : r2.code === 'TIMEOUT' ? 'unknown' : 'dead', code: r2.code };
  }
  let r = await fetchStatus(t.url, 'HEAD');
  if (typeof r.code === 'number' && [403, 405, 400, 501, 406, 429].includes(r.code)) r = await fetchStatus(t.url, 'GET');
  if (typeof r.code === 'number' && r.code >= 200 && r.code < 400) return { ...t, status: 'ok', code: r.code };
  if (typeof r.code === 'number' && [401, 403, 405, 406, 429].includes(r.code)) return { ...t, status: 'blocked', code: r.code };
  if (r.code === 'TIMEOUT' || r.code === 'ERR') return { ...t, status: 'unknown', code: r.code };
  return { ...t, status: 'dead', code: r.code };
}

let running = false;
export async function runLinkHealth(): Promise<HealthReport> {
  if (running) throw new Error('already-running');
  running = true; const started = Date.now();
  try {
    const targets = await collectTargets();
    const results: Result[] = [];
    const queue = [...targets]; const workers = Array.from({ length: 8 }, async () => { for (let t = queue.shift(); t; t = queue.shift()) results.push(await checkTarget(t)); });
    await Promise.all(workers);
    const report: HealthReport = {
      ranAt: new Date().toISOString(), durationMs: Date.now() - started,
      total: { links: targets.filter((t) => t.kind === 'link').length, images: targets.filter((t) => t.kind === 'image').length, streams: targets.filter((t) => t.kind === 'stream').length },
      dead: results.filter((r) => r.status === 'dead' && r.kind !== 'stream'),
      blocked: results.filter((r) => r.status === 'blocked'),
      offlineStreams: results.filter((r) => r.kind === 'stream' && r.status === 'dead'),
      unknown: results.filter((r) => r.status === 'unknown' && r.kind !== 'stream'),
    };
    const prev = await getLastReport();
    const prevDead = new Set((prev?.dead || []).map((d) => d.kind + d.url));
    const newlyDead = report.dead.filter((d) => !prevDead.has(d.kind + d.url));
    await prisma.adminSetting.upsert({ where: { key: KEY }, update: { value: JSON.stringify(report) }, create: { key: KEY, value: JSON.stringify(report) } });
    if (newlyDead.length) {
      const sample = newlyDead.slice(0, 3).map((d) => `${d.src} ${d.label}`).join(', ');
      notifyAdmins('link_health', `죽은 링크·사진 ${newlyDead.length}건 발견`, `${sample}${newlyDead.length > 3 ? ' 외' : ''} — 관리자 설정 > 외부 링크 점검에서 확인`, '/admin').catch(() => {});
    }
    console.log(`[linkHealth] ${targets.length}개 점검, 죽음 ${report.dead.length}, 차단 ${report.blocked.length}, 웹캠 오프 ${report.offlineStreams.length} (${report.durationMs}ms)`);
    return report;
  } finally { running = false; }
}
export function isLinkHealthRunning(): boolean { return running; }

export async function getLastReport(): Promise<HealthReport | null> {
  const row = await prisma.adminSetting.findUnique({ where: { key: KEY } });
  if (!row) return null;
  try { return JSON.parse(row.value) as HealthReport; } catch { return null; }
}

// 매일 04시 KST (보관 파기 03시 다음). 무료 인스턴스 슬립 시엔 다음 깨어난 날 돈다.
export function startLinkHealthScheduler(): void {
  let lastRunDay = '';
  const tick = async () => {
    const kst = new Date(Date.now() + 9 * 3600_000); const day = kst.toISOString().slice(0, 10);
    if (kst.getUTCHours() !== 4 || lastRunDay === day) return;
    lastRunDay = day;
    try { await runLinkHealth(); } catch (e) { console.warn('[linkHealth] 실패:', e instanceof Error ? e.message : e); }
  };
  setInterval(tick, 30 * 60 * 1000);
}
