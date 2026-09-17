import { openStatus, type ShopHoursLike } from '../utils/openNow';

// "영업 중"(초록) / "영업 종료"(회색) 작은 알약 — 영업시간을 알 수 없으면 아무것도 그리지 않는다.
// 목록 카드(렌탈·스키보드샵·정비샵)와 상세 영업시간 줄 옆에 붙인다.
export default function OpenNowBadge({ shop, className = '' }: { shop: ShopHoursLike; className?: string }) {
  const status = openStatus(shop);
  if (status === 'unknown') return null;
  const open = status === 'open';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'} ${className}`}>
      {open ? '영업 중' : '영업 종료'}
    </span>
  );
}
