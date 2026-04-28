import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { categoryIcons, SecondHandIcon } from '../components/CategoryIcons';
import { ChartIcon, ChatIcon, FireIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import BrandHero from '../components/BrandHero';

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

const badgeMap: Record<string, string> = {
  free: '자유', review: '장비리뷰', resort: '스키장', tip: '초보팁', carpool: '카풀',
};

const Home = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [communityTab, setCommunityTab] = useState<'ski' | 'board'>('ski');
  const [polls, setPolls] = useState<CommunityPost[]>([]);
  const [skiPosts, setSkiPosts] = useState<CommunityPost[]>([]);
  const [boardPosts, setBoardPosts] = useState<CommunityPost[]>([]);
  const [, setLangTick] = useState(0);

  useEffect(() => { document.title = '스노우판 - 스키/보드 중고거래 & 렌탈'; }, []);

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

  const categories: { id: keyof typeof categoryIcons; title: string; link: string }[] = [
    { id: 'skishop', title: '스키샵', link: '/new-equipment' },
    { id: 'repair', title: '정비', link: '/repair' },
    { id: 'used', title: t('cat.used'), link: '/used' },
    { id: 'rental', title: t('cat.rental'), link: '/rental' },
    { id: 'lesson', title: t('cat.lesson'), link: '/lesson' },
    { id: 'accommodation', title: t('cat.accommodation'), link: '/accommodation' },
    { id: 'community', title: t('cat.community'), link: '/community' },
    { id: 'competitions', title: '시합일정', link: '/competitions' },
    { id: 'webcam', title: t('cat.webcam'), link: '/webcam' },
  ];

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

  // 인기 커뮤니티 게시글 + 인기 투표 로딩
  useEffect(() => {
    Promise.all([
      api<CommunityPost[]>('/community/popular?sport=ski').catch(() => []),
      api<CommunityPost[]>('/community/popular?sport=board').catch(() => []),
      api<{ posts: CommunityPost[]; totalCount: number }>('/community?category=poll&limit=3').catch(() => ({ posts: [], totalCount: 0 })),
    ]).then(([ski, board, pollRes]) => {
      setSkiPosts(Array.isArray(ski) ? ski.slice(0, 5) : []);
      setBoardPosts(Array.isArray(board) ? board.slice(0, 5) : []);
      setPolls(Array.isArray(pollRes) ? [] : (pollRes?.posts || []));
    });
  }, []);

  return (
    <div className="min-h-screen bg-sky-50">
      <h1 className="sr-only">스노우판 — 스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에</h1>
      {/* Hero — 브랜드 소개 슬라이드 + 광고 rotator (브랜드는 항상 슬라이드 #0) */}
      <div className="px-4 pt-3 pb-5 bg-white">
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 aspect-[3.5/1]">
          {/* Slide #0: 브랜드 소개 */}
          <div
            className={`absolute inset-0 transition-all duration-500 ${
              currentBanner === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
            }`}
          >
            <BrandHero />
          </div>

          {/* Slide #1~N: 광고 */}
          {banners.map((banner, idx) => {
            const slideIdx = idx + 1;
            return (
              <a
                key={banner.id}
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`absolute inset-0 flex items-center px-5 transition-all duration-500 cursor-pointer ${
                  slideIdx === currentBanner
                    ? 'opacity-100 translate-x-0'
                    : slideIdx < currentBanner
                    ? 'opacity-0 -translate-x-full'
                    : 'opacity-0 translate-x-full'
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
                <span className="absolute bottom-2 left-3 text-[9px] font-bold text-white/60 z-10">AD</span>
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

      {/* Categories */}
      <div className="px-4 pb-5 bg-white">
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.id];
            return (
              <Link
                key={cat.id}
                to={cat.link}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
                  <Icon size={34} />
                </div>
                <span className="text-xs font-semibold text-gray-900 text-center whitespace-nowrap">{cat.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Category Sections */}
      <div className="px-4 py-4 space-y-4">

        {/* Hot Deals */}
        <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><SecondHandIcon size={18} /> 중고 인기매물</h2>
            <Link to="/used" className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
          </div>
          {hotDeals.length > 0 ? (
            <div className="space-y-0">
              {hotDeals.map((deal, idx) => (
                <Link
                  key={deal.id}
                  to={`/used/${deal.id}`}
                  className={`flex items-center py-3 ${idx !== hotDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-xl overflow-hidden">
                    {deal.image.startsWith('/') || deal.image.startsWith('http') ? (
                      <img src={imageUrl(deal.image, 200)} alt={deal.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span>{deal.image}</span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{deal.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[14px] font-bold text-gray-900">{deal.price.toLocaleString()}원</span>
                      {deal.status === 'reserved' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">예약중</span>}
                      {deal.status === 'sold' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">판매완료</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">아직 등록된 매물이 없습니다.</p>
          )}
        </div>

        {/* Community */}
        <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><FireIcon size={18} /> 인기 커뮤니티</h2>
            <Link to={`/community/${communityTab}`} className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
          </div>
          <div className="flex gap-1 mb-3">
            <button onClick={() => setCommunityTab('ski')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${communityTab === 'ski' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <SkiIcon size={14} /> 스키
            </button>
            <button onClick={() => setCommunityTab('board')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${communityTab === 'board' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <SnowboardIcon size={14} /> 보드
            </button>
          </div>
          {(communityTab === 'ski' ? skiPosts : boardPosts).length > 0 ? (
            <div className="space-y-0">
              {(communityTab === 'ski' ? skiPosts : boardPosts).map((post, idx, arr) => (
                <Link key={post.id} to={`/community/post/${post.id}`} className={`flex items-center justify-between py-2.5 ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{badgeMap[post.category] || post.category}</span>
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
          <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-gray-900 inline-flex items-center gap-1.5"><ChartIcon size={18} /> 인기 투표</h2>
              <Link to="/community/ski" className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
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
