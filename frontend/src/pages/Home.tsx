import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { categoryIcons } from '../components/CategoryIcons';

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

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

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
      {/* Banner */}
      <div className="px-4 pt-2 pb-5 bg-white">
        <div className="relative overflow-hidden rounded-2xl bg-primary-50 aspect-[3.5/1]">
          {banners.length > 0 ? (
            <>
              {banners.map((banner, idx) => (
                <a
                  key={banner.id}
                  href={banner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`absolute inset-0 flex items-center px-5 transition-all duration-500 cursor-pointer ${
                    idx === currentBanner
                      ? 'opacity-100 translate-x-0'
                      : idx < currentBanner
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
              ))}
              <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded">
                {currentBanner + 1}/{banners.length}
              </div>
            </>
          ) : (
            <Link to="/ad-booking" className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">📢</span>
              <span className="text-sm font-bold text-primary-dark">광고를 신청해보세요!</span>
              <span className="text-[11px] text-gray-400">이 자리에 내 광고가 노출됩니다</span>
            </Link>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pb-5 bg-white">
        <div className="grid grid-cols-5 gap-y-3">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.id];
            return (
              <Link
                key={cat.id}
                to={cat.link}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:bg-gray-100 transition-colors">
                  <Icon size={32} />
                </div>
                <span className="text-xs font-semibold text-gray-900">{cat.title}</span>
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
            <h2 className="text-[15px] font-bold text-gray-900">🏷️ 중고 인기매물</h2>
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
                      <img src={imageUrl(deal.image)} alt={deal.name} className="w-full h-full object-cover" />
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
            <p className="text-sm text-gray-400 text-center py-4">아직 등록된 매물이 없습니다.</p>
          )}
        </div>

        {/* Community */}
        <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">🔥 인기 커뮤니티</h2>
            <Link to={`/community/${communityTab}`} className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
          </div>
          <div className="flex gap-1 mb-3">
            <button onClick={() => setCommunityTab('ski')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${communityTab === 'ski' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`}>
              ⛷️ 스키
            </button>
            <button onClick={() => setCommunityTab('board')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${communityTab === 'board' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'}`}>
              🏂 보드
            </button>
          </div>
          {(communityTab === 'ski' ? skiPosts : boardPosts).length > 0 ? (
            <div className="space-y-0">
              {(communityTab === 'ski' ? skiPosts : boardPosts).map((post, idx, arr) => (
                <Link key={post.id} to={`/community/post/${post.id}`} className={`flex items-center justify-between py-2.5 ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{badgeMap[post.category] || post.category}</span>
                    <span className="text-sm text-gray-900 truncate">{post.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0 ml-2">
                    <span className="text-coral">♥{post.likes}</span>
                    <span>💬{post.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">아직 게시글이 없습니다.</p>
          )}
        </div>

        {/* 인기 투표 */}
        {polls.length > 0 && (
          <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-gray-900">📊 인기 투표</h2>
              <Link to="/community/ski" className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
            </div>
            <div className="space-y-0">
              {polls.map((post, idx) => (
                <Link key={post.id} to={`/poll/${post.id}`} className={`flex items-center justify-between py-2.5 ${idx !== polls.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 flex-shrink-0">투표</span>
                    <span className="text-sm text-gray-900 truncate">{post.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0 ml-2">
                    <span className="text-coral">♥{post.likes}</span>
                    <span>💬{post.commentCount}</span>
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
