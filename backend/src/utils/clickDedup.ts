// 클릭 추적 중복 방지 — (IP, 대상 id) 당 일정 시간 1회만 카운트.
// 새로고침 연타·봇 루프로 클릭 통계가 부풀려지는 것 방지 (관리자 지표·여행사 성과지표 보호).
// 인메모리 (재시작 시 초기화 OK — 통계는 근사치로 충분, 다중 인스턴스면 인스턴스별 창).

const seen = new Map<string, number>(); // `${ip}:${id}` → 마지막 카운트 시각
const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10분
const MAX_ENTRIES = 50_000; // 메모리 상한 — 초과 시 오래된 것부터 정리

setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of seen) if (now - ts > DEDUP_WINDOW_MS) seen.delete(k);
}, 5 * 60 * 1000);

/** 창 내 중복 클릭인지 검사만 (기록 안 함) */
export function isDuplicateClick(ip: string | undefined, targetId: string): boolean {
  const prev = seen.get(`${ip || 'unknown'}:${targetId}`);
  return prev !== undefined && Date.now() - prev < DEDUP_WINDOW_MS;
}

/** 실제 카운트가 반영된 뒤에만 호출 — 가짜 id 로 맵을 채우는 오염 방지 (검사/기록 분리) */
export function recordClick(ip: string | undefined, targetId: string): void {
  const key = `${ip || 'unknown'}:${targetId}`;
  if (seen.size >= MAX_ENTRIES) {
    let n = 0;
    for (const k of seen.keys()) { seen.delete(k); if (++n >= 1000) break; }
  }
  seen.set(key, Date.now());
}
