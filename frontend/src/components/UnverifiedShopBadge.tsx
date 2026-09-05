// 관리자가 공개 영업정보로 시딩한 매장(claimable=true) 표시 — 사장님이 아직 확인하지 않았음을 방문자에게 알림.
// compact: 목록 카드용 작은 칩 / 기본: 상세 페이지 안내 박스.
interface Props {
  claimable?: boolean;
  compact?: boolean;
}

export default function UnverifiedShopBadge({ claimable, compact }: Props) {
  if (!claimable) return null;
  if (compact) {
    return <span className="text-[9px] font-bold px-1 py-px rounded bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">확인 전</span>;
  }
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800 leading-relaxed">
      공개된 기본 정보로 등록된 매장이에요. 사장님이 아직 확인하지 않아 정보가 실제와 다를 수 있습니다. 방문 전 전화로 확인해 주세요.
    </div>
  );
}
