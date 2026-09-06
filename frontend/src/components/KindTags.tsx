// 겸업 칩 — 매장이 두 업종 이상이면 "렌탈·정비" 처럼 표시. 단일 업종이면 아무것도 안 그림.
import { KIND_LABEL, kindsOf, type ShopKind } from '../utils/shopKinds';

export default function KindTags({ shop, own }: { shop: { kind?: string; extraKinds?: string | null }; own: ShopKind }) {
  const kinds = kindsOf(shop, own);
  if (kinds.length < 2) return null;
  return (
    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 flex-shrink-0">
      {kinds.map((k) => KIND_LABEL[k]).join('·')}
    </span>
  );
}
