import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser, imageUrl, trackAdClick } from '../api';
import { useVertical } from '../hooks/useVertical';

interface AdItem {
  id?: string;
  title: string;
  description: string;
  url?: string;
  image?: string | null;
  imagePos?: string | null;
  textColor?: string | null;
  textAlign?: string | null;
}

interface RawAd {
  id?: string;
  title: string;
  description: string;
  url?: string;
  image?: string | null;
  imagePos?: string | null;
  textColor?: string | null;
  textAlign?: string | null;
}

// 카테고리 페이지 상단 광고 배너 — slotType=category, category=<key> 활성 광고를 회전.
// 광고 없으면 "광고 자리 모집 중" placeholder 로 영역 유지 (레이아웃 일관성 + 광고 판매 유도).
export default function CategoryAdBanner({ category }: { category: string }) {
  const vertical = useVertical();
  const [banners, setBanners] = useState<AdItem[]>([]);
  const [current, setCurrent] = useState(0);
  // 슬롯 정원 — 광고가 있어도 자리가 남았으면 로테이션 끝에 "광고 모집" 슬라이드를 붙임
  const [maxConcurrent, setMaxConcurrent] = useState(2);
  const user = getUser();
  // 광고 시스템은 snow 전용 — 다른 판에선 표시 안 함 (스노우 광고 누수 방지).
  const isSnow = vertical.slug === 'snow';
  // 비로그인 시 /login?next=/ad-booking 로 안내해도 되지만 일단 /ad-booking 으로 통일.
  const adLink = user ? '/ad-booking' : '/login?next=/ad-booking';

  useEffect(() => {
    let cancelled = false;
    api<RawAd[]>(`/ad-booking/active?slotType=category&category=${category}`)
      .then((ads) => {
        if (cancelled) return;
        const arr = Array.isArray(ads) ? ads : [];
        setBanners(arr.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          url: a.url,
          image: a.image,
          imagePos: a.imagePos,
          textColor: a.textColor,
          textAlign: a.textAlign,
        })));
      })
      .catch(() => {});
    // 슬롯 정원 조회 (공개) — 실패 시 기본 2 유지
    api<{ slotType: string; category: string; maxConcurrent: number }[]>('/ad-booking/slots')
      .then((slots) => {
        if (cancelled) return;
        const slot = (Array.isArray(slots) ? slots : []).find((sl) => sl.slotType === 'category' && sl.category === category);
        if (slot && typeof slot.maxConcurrent === 'number' && slot.maxConcurrent > 0) setMaxConcurrent(slot.maxConcurrent);
      })
      .catch(() => {});
    setCurrent(0); // 카테고리 전환 시 슬라이드 인덱스 초기화
    return () => { cancelled = true; };
  }, [category]);

  const hasVacancy = banners.length < maxConcurrent; // 자리 남음 → 모집 슬라이드 표시
  const totalSlides = banners.length + (banners.length > 0 && hasVacancy ? 1 : 0);
  // 슬라이드 수가 줄었을 때(슬롯 정원 늦게 도착 등) current 가 범위 밖에 남아
  // 배너가 빈 화면으로 굳던 것 방지 — 범위 밖이면 0 으로 클램프
  useEffect(() => {
    if (totalSlides > 0 && current >= totalSlides) setCurrent(0);
  }, [totalSlides, current]);
  useEffect(() => {
    if (totalSlides <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % totalSlides), 4000);
    return () => clearInterval(t);
  }, [totalSlides]);

  if (!isSnow) return null;

  // 광고 0건 → "여기 광고 모집 중" placeholder.
  if (banners.length === 0) {
    return (
      <Link
        to={adLink}
        aria-label="광고 신청"
        className="block relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white/60 hover:bg-white hover:border-gray-400 transition-colors h-24 flex items-center justify-between px-6"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">AD</span>
            <span className="text-sm font-bold text-gray-700">이 자리 광고 모집 중</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">카테고리 상단 노출 · 클릭해서 신청</p>
        </div>
        <span className="text-xs text-gray-500 ml-3 flex-shrink-0 hidden sm:inline">광고 신청 →</span>
      </Link>
    );
  }

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
            // URL 없는 광고는 클릭해도 이동 안 함 — href="#" 이 해시 이동/스크롤 점프 유발하던 것 방지 (Home 배너와 동일 패턴)
            href={banner.url || undefined}
            target={banner.url ? '_blank' : undefined}
            rel={banner.url ? 'noopener noreferrer' : undefined}
            onClick={banner.url ? () => trackAdClick(banner.id) : (e) => e.preventDefault()}
            aria-hidden={inactive}
            tabIndex={inactive ? -1 : 0}
            className={`absolute inset-0 flex items-center px-6 transition-transform duration-500 ease-in-out ${
              idx === current ? 'translate-x-0' : idx < current ? '-translate-x-full pointer-events-none' : 'translate-x-full pointer-events-none'
            }`}
          >
            {banner.image && (
              <img src={imageUrl(banner.image, 800)} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={banner.imagePos ? { objectPosition: banner.imagePos } : undefined} />
            )}
            {(banner.title || banner.description) ? (
            <div className={`relative z-10 flex-1 ${align}`}>
              <div className={`flex items-center gap-2 mb-0.5 ${justify}`}>
                <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">AD</span>
                {banner.title && <h3 className="text-base font-bold" style={banner.textColor ? { color: banner.textColor } : undefined}>{banner.title}</h3>}
              </div>
              {banner.description && (
              <p
                className="text-sm"
                style={banner.textColor ? { color: banner.textColor, opacity: 0.8 } : { color: '#6b7280' }}
              >
                {banner.description}
              </p>
              )}
            </div>
            ) : (
              <span className="absolute bottom-1.5 left-3 z-10 text-[9px] font-bold bg-black/55 text-white px-1.5 py-0.5 rounded">AD</span>
            )}
          </a>
        );
      })}
      {/* 잔여 자리 모집 슬라이드 — 광고가 있어도 다음 광고주를 상시 유도 (요청) */}
      {banners.length > 0 && hasVacancy && (() => {
        const slideIdx = banners.length;
        const inactive = slideIdx !== current;
        return (
          <Link
            to={adLink}
            aria-hidden={inactive}
            tabIndex={inactive ? -1 : 0}
            className={`absolute inset-0 flex items-center justify-between px-6 transition-transform duration-500 ease-in-out bg-white ${
              slideIdx === current ? 'translate-x-0' : slideIdx < current ? '-translate-x-full pointer-events-none' : 'translate-x-full pointer-events-none'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">AD</span>
                <span className="text-sm font-bold text-gray-700">이 자리 광고 모집 중</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">카테고리 상단 노출 · 클릭해서 신청</p>
            </div>
            <span className="text-xs text-gray-500 ml-3 flex-shrink-0 hidden sm:inline">광고 신청 →</span>
          </Link>
        );
      })()}
      {totalSlides > 1 && (
        <div className="absolute bottom-0 right-0 flex z-10">
          {Array.from({ length: totalSlides }).map((_, idx) => (
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
