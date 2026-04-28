import { useEffect, useState } from 'react';
import { api } from '../api';

interface AdItem {
  title: string;
  description: string;
  url?: string;
  textColor?: string | null;
  textAlign?: string | null;
}

interface RawAd {
  title: string;
  description: string;
  url?: string;
  textColor?: string | null;
  textAlign?: string | null;
}

// 카테고리 페이지 상단 광고 배너 — slotType=category, category=<key> 활성 광고를 회전.
// 광고 없으면 null 반환 (자리 차지 X).
export default function CategoryAdBanner({ category }: { category: string }) {
  const [banners, setBanners] = useState<AdItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<RawAd[]>(`/ad-booking/active?slotType=category&category=${category}`)
      .then((ads) => {
        if (cancelled) return;
        const arr = Array.isArray(ads) ? ads : [];
        setBanners(arr.map((a) => ({
          title: a.title,
          description: a.description,
          url: a.url,
          textColor: a.textColor,
          textAlign: a.textAlign,
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [category]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border h-24"
      style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
    >
      {banners.map((banner, idx) => {
        const inactive = idx !== current;
        const align = banner.textAlign === 'center' ? 'text-center' : banner.textAlign === 'right' ? 'text-right' : '';
        const justify = banner.textAlign === 'center' ? 'justify-center' : banner.textAlign === 'right' ? 'justify-end' : '';
        return (
          <a
            key={idx}
            href={banner.url || '#'}
            target={banner.url ? '_blank' : undefined}
            rel={banner.url ? 'noopener noreferrer' : undefined}
            aria-hidden={inactive}
            tabIndex={inactive ? -1 : 0}
            className={`absolute inset-0 flex items-center px-6 transition-transform duration-500 ease-in-out ${
              idx === current ? 'translate-x-0' : idx < current ? '-translate-x-full pointer-events-none' : 'translate-x-full pointer-events-none'
            }`}
          >
            <div className={`relative z-10 flex-1 ${align}`}>
              <div className={`flex items-center gap-2 mb-0.5 ${justify}`}>
                <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">AD</span>
                <h3 className="text-base font-bold" style={banner.textColor ? { color: banner.textColor } : undefined}>{banner.title}</h3>
              </div>
              <p
                className="text-sm"
                style={banner.textColor ? { color: banner.textColor, opacity: 0.8 } : { color: '#6b7280' }}
              >
                {banner.description}
              </p>
            </div>
          </a>
        );
      })}
      {banners.length > 1 && (
        <div className="absolute bottom-0 right-0 flex z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              aria-label={`슬라이드 ${idx + 1}`}
              aria-current={idx === current}
              className="min-w-11 min-h-11 inline-flex items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-300 ${idx === current ? 'bg-accent w-4' : 'bg-gray-400 w-1.5'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
