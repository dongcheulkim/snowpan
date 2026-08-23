import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';
import WishlistButton from '../components/WishlistButton';
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
  viewCount?: number;
  wishlistCount?: number;
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

// 홈 "지금 핫한 커뮤니티" — /community/popular 상위 5개.
interface PopularPost {
  id: string;
  title: string;
  category: string;
  likes: number;
  views: number;
  images?: string | null;
  commentCount?: number;
  _count?: { comments: number };
}

// 홈 "매장 소식·이벤트" — /shop-posts/recent (승인 매장 전체 최신).
interface ShopNews {
  id: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
  createdAt: string;
  shopName: string;
}

const POST_CAT_LABEL: Record<string, string> = {
  free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장후기',
  tip: '초보팁', carpool: '카풀/동행', meetup: '모임', notice: '공지',
};
const NEWS_TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '소식', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

const Home = () => {
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const verticalBase = isSnow ? '' : vertical.basePath; // '' for snow (root), '/bike' for bike etc.

  const [currentBanner, setCurrentBanner] = useState(0);
  // 매물 30개 노출 + "다른 매물 보기" 새로고침으로 랜덤 오프셋 30개 다시 받음.
  const [feed, setFeed] = useState<Product[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedTotal, setFeedTotal] = useState<number | null>(null);
  const [wishedIds, setWishedIds] = useState<Set<string>>(new Set());
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
  const [popular, setPopular] = useState<PopularPost[]>([]);
  const [news, setNews] = useState<ShopNews[]>([]);

  // 핫한 커뮤니티 + 매장 소식 (snow 전용, 비어있으면 섹션 자체 숨김)
  useEffect(() => {
    if (!isSnow) return;
    api<PopularPost[]>('/community/popular?sport=ski')
      .then((d) => setPopular(Array.isArray(d) ? d : []))
      .catch(() => {});
    api<{ items: ShopNews[] }>('/shop-posts/recent?limit=5')
      .then((d) => setNews(d.items || []))
      .catch(() => {});
  }, [isSnow]);

  // 로그인 시 내 찜 id 집합 로드 (하트 초기 상태).
  useEffect(() => {
    if (!getUser()) return;
    api<{ id: string }[]>('/products/wishlist')
      .then((d) => setWishedIds(new Set((Array.isArray(d) ? d : []).map((p) => p.id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSnow) return; // 배너 광고는 snow 전용 — 다른 판은 브랜드 슬라이드만.
    api<BannerData[]>('/banners')
      .then((data) => setBanners(data))
      .catch(() => {});
  }, [isSnow]);

  // snow: 브랜드 1 + 광고 N + 광고모집 1 (상시 회전). 다른 판: 브랜드 슬라이드만.
  const totalSlides = isSnow ? 2 + banners.length : 1;

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
        { id: 'overseas', title: '스키장 정보', link: '/overseas' },
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
      <h1 className="sr-only">{isSnow ? '스노우판 — 스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에' : `${vertical.name} — ${vertical.tagline}`}</h1>

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
                // URL 없는 광고는 클릭해도 이동 안 함 — 빈 href 로 빈 탭 열리던 것 방지
                href={banner.url || undefined}
                target={banner.url ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={banner.url ? undefined : (e) => e.preventDefault()}
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

          {/* 마지막 슬라이드: 광고 모집 (snow 전용, 상시) — 눌리면 광고 신청으로 */}
          {isSnow && (() => {
            const slideIdx = banners.length + 1;
            const inactive = slideIdx !== currentBanner;
            return (
              <Link
                to="/ad-booking"
                aria-hidden={inactive}
                tabIndex={inactive ? -1 : 0}
                className={`absolute inset-0 flex items-center px-6 transition-transform duration-500 ease-in-out cursor-pointer ${
                  slideIdx === currentBanner
                    ? 'translate-x-0'
                    : slideIdx < currentBanner
                    ? '-translate-x-full pointer-events-none'
                    : 'translate-x-full pointer-events-none'
                }`}
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="relative z-10">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-sky-500 mb-1.5">AD SPACE</p>
                  <p className="text-xl font-bold text-gray-900 leading-snug">이 자리에<br />광고하세요</p>
                  <p className="text-sm text-gray-500 mt-1.5">스키어·보더에게 내 샵을 알릴 기회</p>
                  <span className="inline-block mt-3.5 px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-bold">광고 신청하기 →</span>
                </div>
              </Link>
            );
          })()}

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

      {/* Categories — 둥근 사각 + NEW 배지 (올영 스타일 명료한 클릭 유도) */}
      <div className="px-4 pb-5 bg-snow">
        <div className={`grid ${isSnow ? 'grid-cols-5' : 'grid-cols-4'} gap-y-3 gap-x-1`}>
          {categories.map((cat) => {
            const Icon = (categoryIcons as Record<string, typeof SecondHandIcon>)[cat.id];
            // 신규/핫 카테고리에 빨간 점 (전환 유도). 쿠폰샵은 NEW 강조.
            const showNew = ['used', 'rental', 'competitions'].includes(cat.id as string);
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

      {/* 지금 핫한 커뮤니티 — 최근 7일 인기글 상위 5 */}
      {isSnow && popular.length > 0 && (
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">지금 핫한 커뮤니티</h2>
            <Link to="/community/ski" className="text-xs text-gray-500">전체 보기 &gt;</Link>
          </div>
          <div className="bg-snow rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {popular.slice(0, 5).map((p, i) => {
              const thumb = (p.images || '').split(',').filter(Boolean)[0];
              const comments = p.commentCount ?? p._count?.comments ?? 0;
              return (
                <Link key={p.id} to={`/community/post/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                  <span className={`text-sm font-black w-4 text-center flex-shrink-0 ${i < 3 ? 'text-sky-500' : 'text-gray-300'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {POST_CAT_LABEL[p.category] || p.category} · 좋아요 {p.likes} · 댓글 {comments}
                    </p>
                  </div>
                  {thumb && (thumb.startsWith('/') || thumb.startsWith('http')) && (
                    <img src={imageUrl(thumb, 120)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 매장 소식·이벤트 — 전 매장 최신 소식 (프로모션/이벤트/공지) */}
      {isSnow && news.length > 0 && (
        <div className="px-4 pt-2 pb-4">
          <h2 className="text-[15px] font-bold text-gray-900 mb-3">매장 소식·이벤트</h2>
          <div className="bg-snow rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {news.map((n) => {
              const label = NEWS_TYPE_LABEL[n.postType] || NEWS_TYPE_LABEL.general;
              const thumb = (n.images || '').split(',').filter(Boolean)[0];
              return (
                <Link key={n.id} to={`/shop-post/${n.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${label.color}`}>{label.text}</span>
                      <span className="text-[11px] font-bold text-gray-500 truncate">{n.shopName}</span>
                    </div>
                    <p className="text-[13px] font-medium text-gray-900 truncate mt-1">{n.title}</p>
                  </div>
                  {thumb && (
                    <img src={imageUrl(thumb, 120)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
                    <span className="absolute inset-0 flex items-center justify-center text-4xl">{p.image || (isSnow ? '🎿' : '')}</span>
                  )}
                  {p.status === 'reserved' && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-white">예약중</span>
                  )}
                  {p.status === 'sold' && (
                    <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-bold">판매완료</span>
                  )}
                  <WishlistButton productId={p.id} initial={wishedIds.has(p.id)} />
                </div>
                <p className="mt-2 text-[13px] text-gray-900 line-clamp-2 leading-snug">{p.name}</p>
                <p className="mt-1 text-[15px] font-bold text-gray-900">{p.price.toLocaleString()}원</p>
                {((p.viewCount ?? 0) > 0 || (p.wishlistCount ?? 0) > 0) && (
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span className="inline-flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      {(p.viewCount ?? 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      {(p.wishlistCount ?? 0).toLocaleString()}
                    </span>
                  </div>
                )}
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
              {feedLoading ? '불러오는 중…' : '다른 매물 보기'}
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
