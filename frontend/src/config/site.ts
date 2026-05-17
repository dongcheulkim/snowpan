// 사이트 URL 중앙 관리 — 도메인 변경 시 이 파일 또는 환경변수만 바꾸면 됨.
//
// 우선순위:
//   1. VITE_SITE_URL (Vercel 환경변수) — 프로덕션 도메인
//   2. 빌드 시점에 환경에 없으면 fallback (베타 기간 임시)
//
// PAN 브랜드 전환 후 권장 도메인:
//   - pan.vercel.app / panapp.vercel.app / pan-sports.vercel.app (선택)
//   - 또는 panapp.kr / pan.kr 등 커스텀 도메인 연결 후 그 URL

export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://snowpan.vercel.app';

export const SITE_NAME = 'PAN';
export const SITE_DESCRIPTION = '운동, 모든 것의 장(場). 스키부터 자전거·러닝·서핑·골프·캠핑까지.';
