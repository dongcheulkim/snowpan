import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';

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
  const [currentVideo, setCurrentVideo] = useState(0);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [communityTab, setCommunityTab] = useState<'ski' | 'board'>('ski');
  const [skiPosts, setSkiPosts] = useState<CommunityPost[]>([]);
  const [boardPosts, setBoardPosts] = useState<CommunityPost[]>([]);
  const [, setLangTick] = useState(0);

  // Re-render on language change
  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick((p) => p + 1), 0));
  }, []);

  const youtubeVideos = [
    // 헬스키
    { id: 'HELLSKI_1', channel: '헬스키', title: '영상 제목 1', videoId: 'VIDEO_ID_1' },
    { id: 'HELLSKI_2', channel: '헬스키', title: '영상 제목 2', videoId: 'VIDEO_ID_2' },
    { id: 'HELLSKI_3', channel: '헬스키', title: '영상 제목 3', videoId: 'VIDEO_ID_3' },
    // 최신스키
    { id: 'LATEST_1', channel: '최신스키', title: '영상 제목 1', videoId: 'VIDEO_ID_4' },
    { id: 'LATEST_2', channel: '최신스키', title: '영상 제목 2', videoId: 'VIDEO_ID_5' },
    { id: 'LATEST_3', channel: '최신스키', title: '영상 제목 3', videoId: 'VIDEO_ID_6' },
  ];

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

  const categories = [
    { id: 'used', title: t('cat.used'), icon: '🏷️', link: '/used' },
    { id: 'rental', title: t('cat.rental'), icon: '⛷️', link: '/rental' },
    { id: 'lesson', title: t('cat.lesson'), icon: '🎿', link: '/lesson' },
    { id: 'accommodation', title: t('cat.accommodation'), icon: '🏨', link: '/accommodation' },
    { id: 'community', title: t('cat.community'), icon: '💬', link: '/community' },
    { id: 'gear', title: '장비추천', icon: '🔍', link: '/gear-guide' },
    { id: 'webcam', title: t('cat.webcam'), icon: '📹', link: '/webcam' },
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

  // 커뮤니티 게시글 로딩
  useEffect(() => {
    Promise.all([
      api<{ posts: CommunityPost[]; totalCount: number }>('/community?sport=ski&limit=3').catch(() => ({ posts: [], totalCount: 0 })),
      api<{ posts: CommunityPost[]; totalCount: number }>('/community?sport=board&limit=3').catch(() => ({ posts: [], totalCount: 0 })),
    ]).then(([skiRes, boardRes]) => {
      setSkiPosts(skiRes.posts);
      setBoardPosts(boardRes.posts);
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
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-primary-dark bg-primary-100 px-1.5 py-0.5 rounded">{banner.tag}</span>
                      <span className="text-[15px] font-bold text-gray-800">{banner.title}</span>
                    </div>
                    <p className="text-sm text-gray-500">{banner.description}</p>
                  </div>
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
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 bg-white border-2 border-sky-300 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                {cat.icon}
              </div>
              <span className="text-xs font-semibold text-gray-900">{cat.title}</span>
            </Link>
          ))}
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
            <h2 className="text-[15px] font-bold text-gray-900">💬 커뮤니티</h2>
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

        {/* YouTube Videos */}
        <div className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">🎬 유튜버의 핫한 영상!</h2>
            <div className="flex gap-1">
              {youtubeVideos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentVideo(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentVideo ? 'bg-red-500 w-4' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentVideo * 100}%)` }}
            >
              {youtubeVideos.map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex-shrink-0"
                >
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">YouTube</span>
                        <span className="text-[11px] font-bold text-white">{video.channel}</span>
                      </div>
                      <p className="text-xs text-white/80 truncate">{video.title}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-2.5">
            <button onClick={() => setCurrentVideo(Math.max(0, currentVideo - 1))} disabled={currentVideo === 0} className="text-xs text-gray-400 disabled:opacity-30">← 이전</button>
            <span className="text-[10px] text-gray-400">{currentVideo + 1} / {youtubeVideos.length}</span>
            <button onClick={() => setCurrentVideo(Math.min(youtubeVideos.length - 1, currentVideo + 1))} disabled={currentVideo === youtubeVideos.length - 1} className="text-xs text-gray-400 disabled:opacity-30">다음 →</button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Home;
