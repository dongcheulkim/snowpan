// 광고 슬롯·카테고리 한글 라벨 — frontend 전체에서 공통 사용.
// DB 에는 영문 enum 으로 저장, 표시할 때만 한글로 매핑.

export const SLOT_LABELS: Record<string, string> = {
  main_banner: '메인 배너',
  category: '카테고리 배너',
  premium: '프리미엄 노출',
};

export const SLOT_DESCRIPTIONS: Record<string, string> = {
  main_banner: '홈 화면 상단 배너 — 모든 방문자에게 노출',
  category: '카테고리 페이지 상단 배너 — 해당 카테고리 방문자에게 노출',
  premium: '카테고리 리스트 최상단 고정 — 본인 등록물만 가능',
};

export const AD_CATEGORY_LABELS: Record<string, string> = {
  used: '중고거래',
  rental: '렌탈샵',
  lesson: '레슨',
  accommodation: '숙소',
  skishop: '스키·보드샵',
  repair: '정비샵',
  community: '커뮤니티',
  overseas: '해외 여행',
  none: '전체',
};

export function slotLabelKr(slotType: string): string {
  return SLOT_LABELS[slotType] || slotType;
}

export function categoryLabelKr(category: string | null | undefined): string {
  if (!category || category === 'none') return '';
  return AD_CATEGORY_LABELS[category] || category;
}

// 슬롯+카테고리 조합 라벨 — 예: "카테고리 배너 (스키샵)", "프리미엄 노출 (중고거래)"
export function adSlotLabelKr(slotType: string, category?: string | null): string {
  const slot = slotLabelKr(slotType);
  const cat = categoryLabelKr(category);
  return cat ? `${slot} · ${cat}` : slot;
}

// 공식 광고 요금 (사용자 제공 2026-09-09). 사이트엔 노출하지 않고 관리자 초대 링크 프리셋·안내 메시지에만 쓴다.
// 월결제 = 12개월 계약을 매달 나눠 내는 방식(총액 = 월 × 12), 일시불 = 한 번에, 현금 일시불 = 계좌이체 한 번에 (메인 배너만 별도 할인).
export interface AdPlanPreset { key: string; label: string; months: number; price: number; note?: string }
export const AD_PLAN_PRESETS: Record<string, AdPlanPreset[]> = {
  main_banner: [
    { key: 'monthly', label: '월결제', months: 12, price: 7_200_000, note: '월 600,000원 × 12' },
    { key: 'lump', label: '일시불', months: 12, price: 6_000_000 },
    { key: 'cash', label: '현금 일시불', months: 12, price: 5_500_000 },
  ],
  category: [
    { key: 'monthly', label: '월결제', months: 12, price: 4_800_000, note: '월 400,000원 × 12' },
    { key: 'lump', label: '일시불', months: 12, price: 4_600_000 },
  ],
  premium: [
    { key: 'monthly', label: '월결제', months: 12, price: 2_400_000, note: '월 200,000원 × 12' },
    { key: 'lump', label: '일시불', months: 12, price: 2_200_000 },
  ],
};
