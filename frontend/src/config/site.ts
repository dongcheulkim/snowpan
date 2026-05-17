// 사이트 URL 중앙 관리 — 도메인 변경 시 이 파일 또는 환경변수만 바꾸면 됨.
//
// 우선순위:
//   1. VITE_SITE_URL (Vercel 환경변수) — 커스텀 도메인 사용 시
//   2. 기본: pan.vercel.app (2026-05-17 PAN 브랜드 전환)
//
// 이전 도메인 snowpan.vercel.app 은 Vercel redirect 로 새 도메인으로 자동 전달.

export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://pan.vercel.app';

export const SITE_NAME = 'PAN';
export const SITE_DESCRIPTION = '운동, 모든 것의 장(場). 스키부터 자전거·러닝·서핑·골프·캠핑까지.';
