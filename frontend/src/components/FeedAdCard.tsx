import { api, imageUrl } from '../api';

// 중고거래 목록 사이에 끼는 매물 모양 광고 카드 (당근식, 2026-10-02). 두 종류:
//  - booking: 스노우판 입점 광고주(AdBooking slotType=feed) — "광고" 표시
//  - coupang: 쿠팡 파트너스 상품 — "쿠팡 광고" 표시 + 파트너스 고지(법적 필수, 목록 하단)
export interface FeedAd {
  kind: 'booking' | 'coupang';
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  url: string;
  price?: number | null;
  advertiser?: string | null;
}

function trackFeedAdClick(ad: FeedAd) {
  const path = ad.kind === 'coupang' ? `/coupang-ads/${ad.id}/click` : `/ad-booking/${ad.id}/click`;
  api(path, { method: 'POST' }).catch(() => {});
}

export default function FeedAdCard({ ad }: { ad: FeedAd }) {
  const label = ad.kind === 'coupang' ? '쿠팡 광고' : '광고';
  return (
    <a href={ad.url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackFeedAdClick(ad)} className="card overflow-hidden card-hover block" aria-label={`${label}: ${ad.title}`}>
      <div className="relative h-28 overflow-hidden bg-gray-100">
        {ad.image ? <img src={imageUrl(ad.image, 400)} alt={ad.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />}
        <span className="absolute top-1 left-1 text-[8px] font-bold px-1 py-px rounded bg-black/55 text-white">{label}</span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] text-gray-500 font-medium truncate">{ad.advertiser || (ad.kind === 'coupang' ? '쿠팡' : '스노우판 광고')}</span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{ad.title}</h3>
        {ad.price ? <span className="text-base font-bold text-gray-900">{ad.price.toLocaleString()}원</span> : ad.description ? <p className="text-[11px] text-gray-500 line-clamp-2">{ad.description}</p> : null}
      </div>
    </a>
  );
}
