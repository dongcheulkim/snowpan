import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { categoryIcons, SecondHandIcon } from '../components/CategoryIcons';
import { ChartIcon, ChatIcon, FireIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import BrandHero from '../components/BrandHero';
import SeasonCountdown from '../components/SeasonCountdown';
import { communityCategoryLabel } from '../utils/communityLabels';
import { useVertical } from '../hooks/useVertical';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  status: string;
  createdAt: string;
}

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

interface CommunityPost {
  id: string;
  title: string;
  category: string;
  likes: number;
  views: number;
  commentCount: number;
  user: { name: string };
  createdAt: string;
}

const Home = () => {
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const verticalBase = isSnow ? '' : vertical.basePath; // '' for snow (root), '/bike' for bike etc.

  const [currentBanner, setCurrentBanner] = useState(0);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const sportTabs = vertical.sports || [{ id: 'ski', label: '스키' }, { id: 'board', label: '보드' }];
  const [communityTab, setCommunityTab] = useState<string>(sportTabs[0]?.id || 'ski');
  const [polls, setPolls] = useState<CommunityPost[]>([]);
  const [tabPosts, setTabPosts] = useState<Record<string, CommunityPost[]>>({});
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
      ]
    : (vertical.homeCategories || []).map(c => ({
        id: c.slug,
        title: c.label,
        link: `${verticalBase}/${c.slug}`,
      }));

  // 인기중고매물 독립 로딩 (경량 API, 실패 시 기존 API 폴백)
  useEffect(() => {
    api<Product[]>('/home/hot-deals')
      .then(setHotDeals)
      .catch(() => {
        api<{ products: Product[] }>('/products?category=used&limit=3')
          .then(res => setHotDeals(res.products))
          .catch(() => {});
      });
  }, []);

  // 인기 커뮤니티 게시글 + 인기 투표 로딩 — vertical 의 sports 별로 가져옴
  useEffect(() => {
    Promise.all([
      ...sportTabs.map(s => api<CommunityPost[]>(`/community/popular?sport=${s.id}`).catch(() => [])),
      api<{ posts: CommunityPost[]; totalCount: number }>('/community?category=poll&limit=3').catch(() => ({ posts: [], totalCount: 0 })),
    ]).then((results) => {
      const sportResults = results.slice(0, sportTabs.length) as CommunityPost[][];
      const pollRes = results[results.length - 1] as { posts: CommunityPost[]; totalCount: number };
      const next: Record<string, CommunityPost[]> = {};
      sportTabs.forEach((s, i) => {
        next[s.id] = Array.isArray(sportResults[i]) ? sportResults[i].slice(0, 5) : [];
      });
      setTabPosts(next);
      setPolls(Array.isArray(pollRes) ? [] : (pollRes?.posts || []));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical.slug]);

  // 올영 스타일 상단 GNB 탭. snow vertical 에서만 노출.
  const homeTabs = isSnow
    ? [
        { id: 'home', label: '홈', to: '/', active: true },
        { id: 'new', label: '신상', to: '/new-equipment' },
        { id: 'rank', label: '랭킹', to: '/used' },
        { id: 'rental', label: '렌탈', to: '/rental' },
        { id: 'community', label: '커뮤니티', to: '/community' },
        { id: 'competitions', label: '시합', to: '/competitions' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-sky-50">
      <h1 className="sr-only">스노우판 — 스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에</h1>

      {/* GNB 탭바 — 빠른 이동 (올영 홈/오특/랭킹 자리) */}
      {homeTabs.length > 0 && (
        <nav aria-label="홈 빠른 이동" className="bg-snow border-b border-gray-100">
          <div className="flex gap-5 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: 'none' }}>
            {homeTabs.map(tab => (
              <Link
                key={tab.id}
                to={tab.to}
                className={`flex-shrink-0 text-[14px] font-bold pb-1 border-b-2 transition-colors ${
                  tab.active ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Hero — 브랜드 소개 슬라이드 + 광고 rotator (브랜드는 항상 슬라이드 #0)
          광고 카드는 다크모드에서도 light bg 강제 (광고주가 정한 textColor 가
          어두운 텍스트인 경우 가독성 보존). inline style 로 dark mode override 회피.
          모바일에서 임팩트 위해 정사각형 가까운 비율(5/4), 데스크탑은 슬림 유지. */}
      <div className="px-4 pt-3 pb-5 bg-snow">
        <div
          className="relative overflow-hidden rounded-2xl border aspect-[5/4] sm:aspect-[3/1] lg:aspect-[6/1] sm:max-h-44"
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
                  <img src={imageUrl(banner.image)} alt={banner.title} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
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

      {/* Categories — 둥근 사각 + NEW 배지 (올영 스타일 명료한 클릭 유도) */}
      <div className="px-4 pb-5 bg-snow">
        <div className={`grid ${isSnow ? 'grid-cols-5 lg:grid-cols-9' : 'grid-cols-4'} gap-y-3 gap-x-1`}>
          {categories.map((cat) => {
            const Icon = (categoryIcons as Record<string, typeof SecondHandIcon>)[cat.id];
            // 신규/핫 카테고리에 빨간 점 (전환 유도). 임시 룰: 중고/렌탈/시합.
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

      {/* 시즌 카운트다운 — snow 만 (다른 vertical 은 시즌성 다름) */}
      {isSnow && (
        <div className="px-4 pb-2 bg-snow">
          <SeasonCountdown />
        </div>
      )}

      {/* Category Sections */}
      <div className="px-4 py-4 space-y-4">

        {/* Hot Deals — 가로 스크롤 랭킹 (올영 실시간 랭킹 스타일) */}
        <div className="bg-snow border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: (vertical.accentColor || '#0ea5e9') + '40' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><SecondHandIcon size={18} /> 중고 인기매물 랭킹</h2>
            <Link to={`${verticalBase}/used`} className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-primary-dark font-medium hover:underline">더보기 &gt;</Link>
          </div>
          {hotDeals.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {hotDeals.map((deal, idx) => (
                <Link
                  key={deal.id}
                  to={`${verticalBase}/used/${deal.id}`}
                  className="flex-shrink-0 w-[120px] snap-start"
                >
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {deal.image.startsWith('/') || deal.image.startsWith('http') ? (
                      <img src={imageUrl(deal.image, 240)} alt={deal.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-3xl">{deal.image}</span>
                    )}
                    <span className={`absolute top-1 left-1 min-w-6 h-6 px-1.5 inline-flex items-center justify-center text-[11px] font-black rounded ${idx < 3 ? 'bg-gray-900 text-white' : 'bg-white/90 text-gray-700'}`}>
                      {idx + 1}
                    </span>
                    {deal.status === 'reserved' && (
                      <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-white">예약중</span>
                    )}
                    {deal.status === 'sold' && (
                      <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">판매완료</span>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-gray-900 line-clamp-2 leading-tight">{deal.name}</p>
                  <p className="text-[13px] font-bold text-gray-900 mt-0.5">{deal.price.toLocaleString()}원</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">아직 등록된 매물이 없습니다.</p>
          )}
        </div>

        {/* Community */}
        <div className="bg-snow border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: (vertical.accentColor || '#0ea5e9') + '40' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><FireIcon size={18} /> 인기 커뮤니티</h2>
            <Link to={isSnow ? `/community/${communityTab}` : `${verticalBase}/community`} className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-primary-dark font-medium hover:underline">더보기 &gt;</Link>
          </div>
          <div className="flex gap-1 mb-3">
            {sportTabs.map(s => (
              <button key={s.id} onClick={() => setCommunityTab(s.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${communityTab === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {isSnow && s.id === 'ski' && <SkiIcon size={14} />}
                {isSnow && s.id === 'board' && <SnowboardIcon size={14} />}
                {s.label}
              </button>
            ))}
          </div>
          {(tabPosts[communityTab] || []).length > 0 ? (
            <div className="space-y-0">
              {(tabPosts[communityTab] || []).map((post, idx, arr) => (
                <Link key={post.id} to={`${verticalBase}/community/post/${post.id}`} className={`flex items-center justify-between py-2.5 ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{communityCategoryLabel(post.category, communityTab)}</span>
                    <span className="text-sm text-gray-900 truncate">{post.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-shrink-0 ml-2">
                    <span className="text-coral inline-flex items-center gap-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9.5C.6 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.9 3.5 4 7.5C19 16.5 12 21 12 21z"/></svg>{post.likes}</span>
                    <span className="inline-flex items-center gap-0.5"><ChatIcon size={10} />{post.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">아직 게시글이 없습니다.</p>
          )}
        </div>

        {/* 인기 투표 */}
        {polls.length > 0 && (
          <div className="bg-snow border-2 rounded-2xl p-4 shadow-sm" style={{ borderColor: (vertical.accentColor || '#0ea5e9') + '40' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><ChartIcon size={18} /> 인기 투표</h2>
              <Link to="/community/ski" className="inline-flex items-center min-h-11 px-2 -mx-2 text-xs text-primary-dark font-medium hover:underline">더보기 &gt;</Link>
            </div>
            <div className="space-y-0">
              {polls.map((post, idx) => (
                <Link key={post.id} to={`/poll/${post.id}`} className={`flex items-center justify-between py-2.5 ${idx !== polls.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 flex-shrink-0">투표</span>
                    <span className="text-sm text-gray-900 truncate">{post.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-shrink-0 ml-2">
                    <span className="text-coral inline-flex items-center gap-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9.5C.6 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.9 3.5 4 7.5C19 16.5 12 21 12 21z"/></svg>{post.likes}</span>
                    <span className="inline-flex items-center gap-0.5"><ChatIcon size={10} />{post.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default Home;
