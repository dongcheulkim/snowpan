// 배포 직후 옛 청크(해시가 바뀐 JS 파일)를 불러오다 실패하면 페이지를 새로 받아 복구한다.
// 원인: 탭을 열어 둔 채로 새 배포가 나가면 메모리에 있는 옛 main 이 옛 해시의 lazy 청크를 요청 → 404.
// 이전 구현은 세션당 한 번만 새로고침해서(고정 플래그), 같은 탭에서 두 번째 배포부터는 "문제가 발생했습니다"만 떴다.
// 지금은 "같은 파일이 1분 안에 또 실패"할 때만 포기(무한 루프 방지)하고, 그 외에는 매번 복구한다.

const CHUNK_ERR_RE = /(ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS)/i;
const KEY = 'snowpan.chunkReload'; // {url, at}
const LOOP_WINDOW_MS = 60_000;

export function errorMessageOf(reason: unknown): string {
  if (!reason) return '';
  if (typeof reason === 'string') return reason;
  const r = reason as { message?: unknown; reason?: unknown };
  if (typeof r.message === 'string') return r.message;
  if (r.reason) return errorMessageOf(r.reason);
  return String(reason);
}

export function isChunkError(reason: unknown): boolean {
  return CHUNK_ERR_RE.test(errorMessageOf(reason));
}

// 캐시·서비스워커를 비우고 새로 받는다. 오류 화면의 "새로고침" 버튼도 이걸 쓴다.
export function hardReload(): void {
  const done = () => window.location.reload();
  const jobs: Promise<unknown>[] = [];
  try {
    if ('caches' in window) jobs.push(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))));
    if ('serviceWorker' in navigator) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))));
    }
  } catch { /* 무시 */ }
  // 정리가 끝나면 바로, 오래 걸리면 1초 뒤에라도 새로고침
  let called = false;
  const once = () => { if (!called) { called = true; done(); } };
  Promise.all(jobs).then(once, once);
  setTimeout(once, 1000);
}

// 옛 청크 오류면 새로고침을 시도하고 true. 같은 파일이 1분 안에 다시 실패하면(진짜 루프) false.
export function reloadForStaleChunk(reason: unknown): boolean {
  const msg = errorMessageOf(reason);
  if (!CHUNK_ERR_RE.test(msg)) return false;
  const url = (msg.match(/https?:\/\/\S+/) || [])[0] || '';
  const now = Date.now();
  try {
    const prev = JSON.parse(sessionStorage.getItem(KEY) || 'null') as { url?: string; at?: number } | null;
    if (prev && typeof prev.at === 'number' && now - prev.at < LOOP_WINDOW_MS && (!url || prev.url === url)) return false;
    sessionStorage.setItem(KEY, JSON.stringify({ url, at: now }));
  } catch {
    return false; // 스토리지 불가 — 루프를 막을 수 없으니 새로고침 포기
  }
  hardReload();
  return true;
}
