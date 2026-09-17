// 등록·수정 폼의 구조화 영업시간 값 — components/ShopHoursFields 가 그리고, 6개 매장 폼이 state 로 든다.
// (컴포넌트 파일에서 상수·함수를 같이 export 하면 react-refresh 규칙에 걸려 여기로 분리)
export const DAY_CHIPS: { code: string; label: string }[] = [
  { code: 'mon', label: '월' }, { code: 'tue', label: '화' }, { code: 'wed', label: '수' }, { code: 'thu', label: '목' },
  { code: 'fri', label: '금' }, { code: 'sat', label: '토' }, { code: 'sun', label: '일' },
];

export interface ShopHoursValue { openTime: string; closeTime: string; closedDays: string[] }
export const EMPTY_SHOP_HOURS: ShopHoursValue = { openTime: '', closeTime: '', closedDays: [] };

// API 응답(closedDays 콤마 문자열) → 폼 값. 저장 시엔 폼 값을 그대로 보내면 서버(utils/shopHours.ts)가 검증·정규화한다.
export function shopHoursFromApi(d: { openTime?: string | null; closeTime?: string | null; closedDays?: string | null }): ShopHoursValue {
  return { openTime: d.openTime || '', closeTime: d.closeTime || '', closedDays: (d.closedDays || '').split(',').filter(Boolean) };
}
