// 로그인 페이지로 보낼 때 지금 보던 화면을 next 로 붙인다 — 로그인 끝나면 홈이 아니라 제자리로 돌아오게.
// (2026-09-14 전체검사: 찜·좋아요·문의·신고 등 16곳이 next 없이 /login 으로 보내 로그인 후 홈으로 떨어졌음)
// Login.tsx 가 next 를 내부 경로만 허용(open redirect 방지)하므로 여기서도 같은 규칙으로 거른다.
export function loginPath(next?: string): string {
  let target = next;
  if (target === undefined && typeof window !== 'undefined') target = window.location.pathname + window.location.search;
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/login')) return '/login';
  return `/login?next=${encodeURIComponent(target)}`;
}
