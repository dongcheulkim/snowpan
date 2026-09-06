// 매장(스키·보드샵·정비샵·렌탈샵) 공통 위치 규칙.
// 필터: 지역(시/도) → 그 지역 리조트 칩 + '외'(리조트 인근이 아닌 시내 매장). 동네 칩은 만들지 않는다(버튼 과다).
// 표시: 리조트가 연결돼 있으면 리조트명, 없으면 주소에서 뽑은 동네(시군구 읍면동), 그것도 없으면 지역.

export const SHOP_REGIONS = ['강원', '경기', '서울', '충청', '경상', '전라'] as const;

export interface ResortLite { id: string; name: string; location?: string | null }

// 주소 → 동네 라벨. "경기도 광주시 도척면 도척윗로 235-2" → "광주시 도척면", "서울특별시 강남구 논현로132길 11" → "강남구"
export function districtFromAddress(address?: string | null): string {
  if (!address) return '';
  const tokens = address.trim().split(/\s+/);
  if (tokens.length < 2) return '';
  const out: string[] = [];
  for (const t of tokens.slice(1, 4)) {
    // 도로명(…로/…길)·번지·건물명이 나오면 중단
    if (/\d/.test(t) || /(로|길|대로)$/.test(t)) break;
    if (/(시|군|구|읍|면|동|리)$/.test(t)) out.push(t);
    else break;
  }
  return out.join(' ');
}

// 카드·상세용 위치 라벨
export function shopLocationLabel(shop: { resort?: { name: string } | null; address?: string | null; area?: string | null }): string {
  if (shop.resort?.name) return shop.resort.name;
  return districtFromAddress(shop.address) || shop.area || '';
}
