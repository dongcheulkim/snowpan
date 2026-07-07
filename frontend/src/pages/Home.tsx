import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { categoryIcons, SecondHandIcon } from '../components/CategoryIcons';
import BrandHero from '../components/BrandHero';
import { useVertical } from '../hooks/useVertical';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  status: string;
  createdAt: string;
}

// 한 번에 보여줄 매물 수. 새로고침 누르면 랜덤 다른 30개로 교체.
const FEED_PAGE_SIZE = 30;

interface BannerData {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
  image: string | null;
  textColor?: string | null;
  textAlign?: string | null;
}

const Home = () => {
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const verticalBase = isSnow ? '' : vertical.basePath; // '' for snow (root), '/bike' for bike etc.

  const [currentBanner, setCurrentBanner] = useState(0);
  // 매물 30개 노출 + "다른 매물 보기" 새로고침으로 랜덤 오프셋 30개 다시 받음.
  const [feed, setFeed] = useState<Product[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedTotal, setFeedTotal] = useState<number | null>(null);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    document.title = isSnow
      ? '스노우판 - 스키/보드 중고거래 & 렌탈'
      : `${vertical.name} - ${vertical.tagline} | PAN`;
  }, [isSnow, vertical]);

  // Re-render on language change
  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick((p) => p + 1), 0));
  }, []);

  const [banners, setBanners] = useState<BannerData[]>([]);

  useEffect(() => {
    api<BannerData[]>('/banners')
      .then((data) => setBanners(data))
      .catch(() => {});
  }, []);

  // 브랜드 슬라이드 1 + 광고 N = 총 슬라이드 수. 브랜드 혼자면 회전 안 함.
  const totalSlides = 1 + banners.length;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  // 카테고리는 vertical 별로 다름.
  // snow 는 기존 9개 (스키 도메인 특화). 다른 vertical 은 config 의 homeCategories.
  const categories: { id: keyof typeof categoryIcons | string; title: string; link: string }[] = isSnow
    ? [
        { id: 'skishop', title: '스키샵', link: '/new-equipment' },
        { id: 'repair', title: '정비', link: '/repair' },
        { id: 'used', title: t('cat.used'), link: '/used' },
        { id: 'rental', title: t('cat.rental'), link: '/rental' },
        { id: 'lesson', title: t('cat.lesson'), link: '/lesson' },
        { id: 'accommodation', title: t('cat.accommodation'), link: '/accommodation' },
        { id: 'community', title: t('cat.community'), link: '/community' },
        { id: 'competitions', title: '시합일정', link: '/competitions' },
        { id: 'webcam', title: t('cat.webcam'), link: '/webcam' },
        { id: 'coupon', title: '쿠폰샵', link: '/coupons' },
      ]
    : (vertical.homeCategories || []).map(c => ({
        id: c.slug,
        title: c.label,
        link: `${verticalBase}/${c.slug}`,
      }));

  // 매물 피드 로드 — randomize=true 면 totalCount 기준 랜덤 오프셋으로 다른 30개.
  const loadFeed = useCallback(async (randomize: boolean) => {
    setFeedLoading(true);
    try {
      // 랜덤이면 totalCount 알아야 유효 오프셋 계산. 첫 로드시도 알 수 있음.
      let offset = 0;
      const knownTotal = feedTotal;
      if (randomize && knownTotal && knownTotal > FEED_PAGE_SIZE) {
        const maxOffset = Math.max(0, knownTotal - FEED_PAGE_SIZE);
        offset = Math.floor(Math.random() * (maxOffset + 1));
      }
      const res = await api<{ products: Product[]; totalCount?: number } | Product[]>(
        `/products?category=used&limit=${FEED_PAGE_SIZE}&offset=${offset}`
      );
      const items = Array.isArray(res) ? res : (res.products || []);
      const total = Array.isArray(res) ? null : (res.totalCount ?? null);
      setFeed(items);
      if (total !== null) setFeedTotal(total);
      // 페이지 상단으로 부드럽게 스크롤 (새로고침 클릭 시).
      if (randomize) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // 실패 시 그대로 유지.
    } finally {
      setFeedLoading(false);
    }
  }, [feedTotal]);

  // 첫 로드 + vertical 바뀌면 리셋.
  useEffect(() => {
    setFeed([]);
    setFeedTotal(null);
    loadFeed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical.slug]);

  return (
    <div className="min-h-screen bg-sky-50">
      <h1 className="sr-only">스노우판 — 스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에</h1>

      {/* Hero — 브랜드 소개 슬라이드 + 광고 rotator (브랜드는 항상 슬라이드 #0)
          광고 카드는 다크모드에서도 light bg 강제 (광고주가 정한 textColor 가
          어두운 텍스트인 경우 가독성 보존). inline style 로 dark mode override 회피.
          모바일에서 임팩트 위해 정사각형 가까운 비율(5/4), 데스크탑은 슬림 유지. */}
      <div className="px-4 pt-3 pb-5 bg-snow">
        <div
          className="relative overflow-hidden rounded-2xl border aspect-[5/4]"
          style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
        >
          {/* Slide #0: 브랜드 소개 — translate-only 슬라이드 (opacity 페이드 제거 → 두 슬라이드 동시 노출 버그 해소) */}
          <div
            aria-hidden={currentBanner !== 0}
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              currentBanner === 0 ? 'translate-x-0' : '-translate-x-full pointer-events-none'
            }`}
          >
            <BrandHero />
          </div>

          {/* Slide #1~N: 광고 */}
          {banners.map((banner, idx) => {
            const slideIdx = idx + 1;
            const inactive = slideIdx !== currentBanner;
            return (
              <a
                key={banner.id}
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={inactive}
                tabIndex={inactive ? -1 : 0}
                className={`absolute inset-0 flex items-center px-5 transition-transform duration-500 ease-in-out cursor-pointer ${
                  slideIdx === currentBanner
                    ? 'translate-x-0'
                    : slideIdx < currentBanner
                    ? '-translate-x-full pointer-events-none'
                    : 'translate-x-full pointer-events-none'
                }`}
              >
                {banner.image && (
                  <img src={imageUrl(banner.image, 900)} alt={banner.title} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                )}
                <div className={`flex-1 relative z-10 ${banner.textAlign === 'center' ? 'text-center' : banner.textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${banner.textAlign === 'center' ? 'justify-center' : banner.textAlign === 'right' ? 'justify-end' : ''}`}>
                    <span className="text-[15px] font-bold" style={banner.textColor ? { color: banner.textColor } : undefined}>{banner.title}</span>
                  </div>
                  <p className="text-sm" style={banner.textColor ? { color: banner.textColor, opacity: 0.8 } : { color: '#6b7280' }}>{banner.description}</p>
                </div>
                <span className="absolute bottom-2 left-3 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/55 text-white z-10">AD</span>
              </a>
            );
          })}

          {/* 인디케이터 — 슬라이드 2개 이상일 때만 */}
          {totalSlides > 1 && (
            <div className="absolute bottom-0 right-0 flex z-10">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  aria-label={`슬라이드 ${i + 1}`}
                  aria-current={i === currentBanner}
                  className="min-w-11 min-h-11 inline-flex items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'bg-gray-900 w-5' : 'bg-gray-400 w-1.5'}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 스노우런 프로모 — 킬러 기능 강조 (배너 바로 아래) */}
      {isSnow && (
        <div className="px-4 pb-3 bg-snow">
          <Link
            to="/snow-run"
            className="block bg-gray-900 text-white rounded-2xl p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">⚡</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-300">스노우런 트래킹</p>
                <p className="text-base font-black mt-0.5">탈 때마다 100P 적립</p>
                <p className="text-[11px] text-gray-400 mt-0.5">1일 최대 1,000P · 쿠폰으로 사용</p>
              </div>
              <span className="text-lg text-gray-400 flex-shrink-0">›</span>
            </div>
          </Link>
        </div>
      )}

      {/* Categories — 둥근 사각 + NEW 배지 (올영 스타일 명료한 클릭 유도) */}
      <div className="px-4 pb-5 bg-snow">
        <div className={`grid ${isSnow ? 'grid-cols-5' : 'grid-cols-4'} gap-y-3 gap-x-1`}>
          {categories.map((cat) => {
            const Icon = (categoryIcons as Record<string, typeof SecondHandIcon>)[cat.id];
            // 신규/핫 카테고리에 빨간 점 (전환 유도). 쿠폰샵은 NEW 강조.
            const showNew = ['used', 'rental', 'competitions', 'coupon'].includes(cat.id as string);
            return (
              <Link
                key={cat.id}
                to={cat.link}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className="relative w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-200 transition-colors">
                  {Icon ? <Icon size={32} /> : <span className="text-[10px] font-black tracking-widest text-gray-400">{cat.id.toUpperCase().slice(0, 4)}</span>}
                  {showNew && (
                    <span className="absolute top-1 right-1 w-4 h-4 inline-flex items-center justify-center text-[8px] font-black text-white bg-coral rounded-full">N</span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-gray-900 text-center whitespace-nowrap">{cat.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 중고매물 30개 노출 + "다른 매물 보기" 새로고침으로 랜덤 30개 교체 */}
      <div className="px-4 pt-2 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5">
            <SecondHandIcon size={18} /> {t('cat.used')}
            {feedTotal !== null && (
              <span className="text-[11px] font-medium text-gray-500 ml-1">({feedTotal.toLocaleString()})</span>
            )}
          </h2>
          <Link to={`${verticalBase}/used`} className="text-xs text-gray-500">전체 보기 &gt;</Link>
        </div>

        {feed.length === 0 && !feedLoading ? (
          <p className="text-sm text-gray-500 text-center py-10">아직 등록된 매물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {feed.map((p) => (
              <Link
                key={p.id}
                to={`${verticalBase}/used/${p.id}`}
                className="flex flex-col active:opacity-80 transition-opacity"
              >
                <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  {p.image && (p.image.startsWith('/') || p.image.startsWith('http')) ? (
                    <img
                      src={imageUrl(p.image, 400)}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-4xl">{p.image || '🎿'}</span>
                  )}
                  {p.status === 'reserved' && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-white">예약중</span>
                  )}
                  {p.status === 'sold' && (
                    <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-bold">판매완료</span>
                  )}
                </div>
                <p className="mt-2 text-[13px] text-gray-900 line-clamp-2 leading-snug">{p.name}</p>
                <p className="mt-1 text-[15px] font-bold text-gray-900">{p.price.toLocaleString()}원</p>
              </Link>
            ))}
          </div>
        )}

        {/* 다른 매물 보기 — 랜덤 오프셋으로 30개 새로 받아 교체 */}
        {feed.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={() => loadFeed(true)}
              disabled={feedLoading || (feedTotal !== null && feedTotal <= FEED_PAGE_SIZE)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-bold rounded-full active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              <svg
                className={`w-4 h-4 ${feedLoading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <polyline points="21 3 21 8 16 8" />
                <polyline points="3 21 3 16 8 16" />
              </svg>
              {feedLoading ? '불러오는 중…' : '🔄 다른 매물 보기'}
            </button>
            {feedTotal !== null && feedTotal > FEED_PAGE_SIZE && (
              <p className="text-[11px] text-gray-500">
                전체 {feedTotal.toLocaleString()}건 중 30개 노출 중
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
