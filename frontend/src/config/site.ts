// 사이트 URL 중앙 관리 — 도메인 변경 시 이 파일 또는 환경변수만 바꾸면 됨.
//
// 우선순위:
//   1. VITE_SITE_URL (Vercel 환경변수) — 커스텀 도메인 사용 시
//   2. 기본: snowpan.kr (2026-07-21 커스텀 도메인 연결)

export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://snowpan.kr';

export const SITE_NAME = '스노우판';
export const SITE_DESCRIPTION = '스키·보드 중고거래·렌탈·레슨·숙소를 한 곳에. 시즌의 모든 것.';
