// 매장 업종(판매·정비·렌탈) 공통 — 겸업 칩 표시와 상세 링크. 백엔드 utils/shopKinds.ts 와 짝.
export type ShopKind = 'skishop' | 'repair' | 'rental';
export const KIND_LABEL: Record<ShopKind, string> = { skishop: '판매', repair: '정비', rental: '렌탈' };
export const KIND_PATH: Record<ShopKind, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental' };

// 목록 응답의 kind(원 업종) 기준으로 상세 링크 — 겸업으로 다른 목록에 섞여 있어도 원래 상세로 간다
export function shopPath(kind: string | undefined, id: string, fallback: ShopKind): string {
  const k = (kind && kind in KIND_PATH ? kind : fallback) as ShopKind;
  return `${KIND_PATH[k]}/${id}`;
}

export function kindsOf(shop: { kind?: string; extraKinds?: string | null }, own: ShopKind): ShopKind[] {
  const k = (shop.kind && shop.kind in KIND_LABEL ? shop.kind : own) as ShopKind;
  const extra = (shop.extraKinds || '').split(',').map((x) => x.trim()).filter((x): x is ShopKind => x in KIND_LABEL && x !== k);
  return [k, ...extra];
}
