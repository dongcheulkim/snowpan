import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [currentBanner, setCurrentBanner] = useState(0);


  const banners = [
    { title: '보드팩토리 강남점', desc: '시즌 오픈 전 장비 튜닝 50% 할인', tag: 'AD', url: 'https://www.boardfactory.co.kr' },
    { title: '스키프로샵 홍대점', desc: '24/25 신상 부츠 피팅 무료 · 풀세트 특가', tag: 'AD', url: 'https://www.skiproshop.co.kr' },
    { title: '라이더스클럽 판교점', desc: '중고 위탁판매 수수료 0% · 왁싱 서비스', tag: 'AD', url: 'https://www.ridersclub.co.kr' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = [
    { id: 'used', title: '중고거래', icon: '🏷️', link: '/used' },
    { id: 'rental', title: '렌탈', icon: '⛷️', link: '/rental' },
    { id: 'lesson', title: '레슨', icon: '🎿', link: '/lesson' },
    { id: 'accommodation', title: '숙소', icon: '🏨', link: '/accommodation' },
    { id: 'community', title: '커뮤니티', icon: '💬', link: '/community' },
  ];

  const hotDeals = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', price: 450000, location: '서울 강남구', time: '3시간 전', likes: 28 },
    { id: '8', name: 'Atomic Maverick 86 (2023)', price: 520000, location: '경기 성남시', time: '5시간 전', likes: 35 },
    { id: '2', name: 'Burton Custom (2021)', price: 380000, location: '서울 마포구', time: '1일 전', likes: 22 },
  ];

  const communityPosts = [
    { id: 'c1', title: '올 시즌 첫 스키 후기!', category: '스키장후기', author: '스키매니아', comments: 12, likes: 34 },
    { id: 'c2', title: '초보 보더 장비 추천 부탁드려요', category: '초보팁', author: '뉴보더', comments: 23, likes: 18 },
    { id: 'c3', title: '용평 주말 카풀 구합니다 (3/22)', category: '카풀/동행', author: '라이더킴', comments: 8, likes: 5 },
  ];

  const defaultHotTopics = [
    { id: 'ht1', title: '올 시즌 최고의 스키장은?', likes: 256, totalVotes: 427 },
    { id: 'ht2', title: '초보자 첫 장비, 중고 vs 새제품?', likes: 189, totalVotes: 314 },
    { id: 'ht3', title: '보드 바인딩 각도 세팅 공유해요', likes: 134, totalVotes: 0 },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userPolls = JSON.parse(localStorage.getItem('userPolls') || '[]').map((p: any) => ({
    id: p.id,
    title: p.title,
    likes: p.likes || 0,
    totalVotes: p.totalVotes || 0,
  }));

  const hotTopics = [...userPolls, ...defaultHotTopics].sort((a, b) => b.likes - a.likes).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Banner */}
      <div className="px-4 pt-2 pb-5 bg-white">
        <div className="relative overflow-hidden rounded-2xl bg-primary-50 h-[100px]">
          {banners.map((banner, idx) => (
            <a
              key={idx}
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
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-primary-dark bg-primary-100 px-1.5 py-0.5 rounded">{banner.tag}</span>
                  <span className="text-[15px] font-bold text-gray-800">{banner.title}</span>
                </div>
                <p className="text-sm text-gray-500">{banner.desc}</p>
              </div>
            </a>
          ))}
          <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded">
            {currentBanner + 1}/{banners.length}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pb-5 bg-white">
        <div className="flex justify-between">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 bg-gray-200 border-2 border-gray-400 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                {cat.icon}
              </div>
              <span className="text-xs font-semibold text-gray-700">{cat.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Category Sections */}
      <div className="px-4 py-4 space-y-4">

        {/* Hot Deals */}
        <div className="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">🏷️ 중고 인기매물</h2>
            <Link to="/used" className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
          </div>
          <div className="space-y-0">
            {hotDeals.map((deal, idx) => (
              <Link
                key={deal.id}
                to={`/used/${deal.id}`}
                className={`flex items-center py-3 ${idx !== hotDeals.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-xl">
                  ⛷️
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{deal.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{deal.location} · {deal.time}</div>
                  <div className="text-[14px] font-bold text-gray-900 mt-1">{deal.price.toLocaleString()}원</div>
                </div>
                <div className="flex items-center gap-0.5 text-gray-300 self-end pb-1 ml-2">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span className="text-[11px]">{deal.likes}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Community */}
        <div className="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">💬 커뮤니티</h2>
            <Link to="/community" className="text-xs text-primary-dark font-medium">더보기 &gt;</Link>
          </div>
          <div className="space-y-0">
            {communityPosts.map((post, idx) => (
              <Link
                key={post.id}
                to={`/community/post/${post.id}`}
                className={`block py-2.5 ${idx !== communityPosts.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-primary-dark bg-primary-50 px-1.5 py-0.5 rounded">{post.category}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{post.title}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                  <span>{post.author}</span>
                  <span>♡ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Hot Topics */}
        <div className="bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-bold text-gray-900">핫한 주제</h2>
              <span className="text-[10px] font-semibold text-white bg-red-500 px-1.5 py-0.5 rounded-full">HOT</span>
            </div>
            <Link to="/community" className="text-xs text-gray-400">더보기 ›</Link>
          </div>
          <div className="space-y-0">
            {hotTopics.map((topic, idx) => (
              <Link
                key={topic.id}
                to={`/poll/${topic.id}`}
                className={`flex items-center justify-between py-3 ${idx !== hotTopics.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0">투표</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{topic.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 ml-2 flex-shrink-0">
                  <span>♡ {topic.likes}</span>
                  {topic.totalVotes > 0 && (
                    <span>{topic.totalVotes}명</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Webcam */}
      <div className="px-4 pt-1 pb-8">
        <Link
          to="/webcam"
          className="block bg-white border-2 border-gray-300 rounded-2xl p-5 shadow-md active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center text-xl">
                📹
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-gray-900">실시간 웹캠</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">전국 스키장 실시간 웹캠 보기</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Home;
