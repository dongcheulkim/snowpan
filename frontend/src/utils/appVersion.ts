// 앱 버전 문자열 비교 — 앱 업데이트 안내(AppUpdatePrompt)에서 사용 (2026-09-25)
// '1.7' vs '1.7.1' 처럼 자리 수가 달라도 비교 (숫자 조각 순서대로)
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0); const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
