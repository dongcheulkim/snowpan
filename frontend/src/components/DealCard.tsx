import { api, imageUrl, openExternal } from '../api';

export interface Deal {
  id: string;
  title: string;
  partner?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  description?: string | null;
  image?: string | null;
  link: string;
  badge?: string | null;
  resort?: { slug: string; name: string } | null;
}

// 해외 여행 딜/광고 카드 — 클릭 시 클릭수 추적 후 외부 파트너 링크로 이동(중개).
export default function DealCard({ deal, showResort = false }: { deal: Deal; showResort?: boolean }) {
  const open = () => {
    api(`/overseas/deals/${deal.id}/click`, { method: 'POST' }).catch(() => {}); // 클릭 추적(중개 성과)
    openExternal(deal.link);
  };
  const discount = deal.originalPrice && deal.price && deal.originalPrice > deal.price
    ? Math.round((1 - deal.price / deal.originalPrice) * 100) : 0;

  return (
    <button
      onClick={open}
      className="w-full text-left bg-snow border border-gray-200 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform hover:border-sky-300"
    >
      {deal.image ? (
        <div className="h-28 bg-gray-100 overflow-hidden">
          <img
            src={imageUrl(deal.image, 480)}
            alt={deal.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { const p = (e.currentTarget.parentElement as HTMLElement); if (p) p.style.display = 'none'; }}
          />
        </div>
      ) : null}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          {deal.badge && (
            <span className="text-[10px] font-bold text-white bg-coral px-1.5 py-0.5 rounded">{deal.badge}</span>
          )}
          {deal.partner && (
            <span className="text-[10px] font-bold text-gray-500">{deal.partner}</span>
          )}
          {showResort && deal.resort && (
            <span className="text-[10px] font-bold text-sky-600 ml-auto">{deal.resort.name}</span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900 leading-snug">{deal.title}</p>
        {deal.description && (
          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{deal.description}</p>
        )}
        <div className="flex items-center justify-between mt-2.5">
          <div className="min-w-0">
            {deal.price != null ? (
              <div className="flex items-baseline gap-1.5">
                {discount > 0 && <span className="text-xs font-bold text-coral">{discount}%</span>}
                <span className="text-base font-black text-gray-900">{deal.price.toLocaleString()}원~</span>
                {deal.originalPrice != null && deal.originalPrice > (deal.price ?? 0) && (
                  <span className="text-[11px] text-gray-400 line-through">{deal.originalPrice.toLocaleString()}</span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-gray-500">가격·일정 문의</span>
            )}
          </div>
          <span className="text-xs font-bold text-sky-600 flex-shrink-0">
            {deal.price != null ? '예약하기' : '자세히'} ›
          </span>
        </div>
      </div>
    </button>
  );
}
