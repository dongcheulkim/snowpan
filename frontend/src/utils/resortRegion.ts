// 리조트 location(예: "강원도 평창군") → 지역 대분류. 숙소·레슨 등 리조트 기반 필터 공용.
export function resortRegion(location?: string | null): string {
  if (!location) return '기타';
  if (location.startsWith('강원')) return '강원';
  if (location.startsWith('경기')) return '경기';
  if (location.startsWith('전')) return '전라';
  if (location.startsWith('경남') || location.startsWith('경북') || location.startsWith('경상')) return '경상';
  if (location.startsWith('충')) return '충청';
  return '기타';
}
export const RESORT_REGION_ORDER = ['강원', '경기', '전라', '경상', '충청', '기타'];
