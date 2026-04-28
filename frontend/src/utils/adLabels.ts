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
  rental: '렌탈',
  lesson: '레슨',
  accommodation: '숙소',
  skishop: '스키샵',
  repair: '정비',
  community: '커뮤니티',
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
