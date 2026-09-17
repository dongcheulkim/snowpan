// 렌탈샵 등록·수정 폼의 가격표 값(1일 기준) — components/RentalPriceFields 가 그린다.
// 폼 값은 숫자만 담은 문자열('' = 미입력). 서버가 스키·보드 세트 중 최저가를 priceFrom 으로 계산해 목록 정렬·"세트 30,000원~" 표시에 쓴다.
export const RENTAL_PRICE_ROWS = [
  { key: 'priceSkiSet', label: '스키 세트' },
  { key: 'priceBoardSet', label: '보드 세트' },
  { key: 'priceClothes', label: '의류' },
  { key: 'priceHelmet', label: '헬멧' },
  { key: 'priceGoggles', label: '고글' },
] as const;
export type RentalPriceKey = (typeof RENTAL_PRICE_ROWS)[number]['key'];
export type RentalPriceValue = Record<RentalPriceKey, string> & { priceNote: string };
export const EMPTY_RENTAL_PRICES: RentalPriceValue = { priceSkiSet: '', priceBoardSet: '', priceClothes: '', priceHelmet: '', priceGoggles: '', priceNote: '' };

// 폼 값 → API 바디. 빈칸은 null 로 보내 지운다.
export function rentalPricesToBody(v: RentalPriceValue): Record<string, number | string | null> {
  const out: Record<string, number | string | null> = {};
  for (const { key } of RENTAL_PRICE_ROWS) out[key] = v[key] === '' ? null : Number(v[key]);
  out.priceNote = v.priceNote.trim() || null;
  return out;
}

// API 응답 → 폼 값
export function rentalPricesFromApi(d: Partial<Record<RentalPriceKey, number | null>> & { priceNote?: string | null }): RentalPriceValue {
  const out = { ...EMPTY_RENTAL_PRICES };
  for (const { key } of RENTAL_PRICE_ROWS) { const n = d[key]; out[key] = typeof n === 'number' ? String(n) : ''; }
  out.priceNote = d.priceNote || '';
  return out;
}
