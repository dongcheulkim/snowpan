// 스키장 투어(overseas) 슬러그 ↔ 웹캠(webcams) 슬러그 — 표기가 다른 3곳만 보정. 목록·상세가 같이 쓴다 (2026-09-27).
export const WEBCAM_ALIAS: Record<string, string> = { 'elysian-gangchon': 'elysian', oakvalley: 'oak', edenvalley: 'eden' };
export const camSlugOf = (slug: string) => WEBCAM_ALIAS[slug] || slug;
// 웹캠 보유 국내 리조트 고정 목록 — 기온 API 가 일시 실패해도 웹캠 표시는 유지
export const WEBCAM_SLUGS = new Set(['yongpyong', 'wellihilli', 'konjiam', 'phoenix', 'high1', 'vivaldi', 'elysian', 'jisan', 'muju', 'oak', 'o2', 'alpensia', 'eden']);
export const hasDomesticCam = (slug: string) => WEBCAM_SLUGS.has(camSlugOf(slug));
