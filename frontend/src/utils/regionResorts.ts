// 지역(대분류) → 소속 리조트(소분류) — 스키샵 목록 필터·등록 폼 공용.
export const REGION_RESORTS: Record<string, string[]> = {
  강원: ['용평리조트', '웰리힐리파크', '하이원리조트', '휘닉스평창', '비발디파크', '엘리시안강촌', '오크밸리'],
  경기: ['곤지암리조트', '지산리조트'],
  전라: ['무주덕유산'],
  경상: ['에덴밸리'],
};
export const ALL_RESORTS = Object.values(REGION_RESORTS).flat();
