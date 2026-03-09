import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    {
      title: '보드팩토리 강남점',
      desc: '시즌 오픈 전 장비 튜닝 50% 할인 이벤트',
      gradient: 'from-neon-blue/30 to-neon-purple/30',
      accent: 'text-neon-blue',
      tag: 'AD',
    },
    {
      title: '스키프로샵 홍대점',
      desc: '24/25 신상 부츠 피팅 무료 · 장비 풀세트 특가',
      gradient: 'from-neon-purple/30 to-neon-pink/30',
      accent: 'text-neon-purple',
      tag: 'AD',
    },
    {
      title: '라이더스클럽 판교점',
      desc: '중고 장비 위탁판매 수수료 0% · 왁싱 서비스',
      gradient: 'from-neon-orange/30 to-amber-500/30',
      accent: 'text-neon-orange',
      tag: 'AD',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);
  const categories = [
    {
      id: 'used',
      icon: '♻️',
      title: '중고',
      desc: '합리적 가격',
      link: '/used',
      gradient: 'from-emerald-600/80 to-green-500/80',
      glow: 'hover:shadow-emerald-500/20',
    },
    {
      id: 'rental',
      icon: '🏔️',
      title: '렌탈',
      desc: '스키장별',
      link: '/rental',
      gradient: 'from-purple-600/80 to-pink-500/80',
      glow: 'hover:shadow-purple-500/20',
    },
    {
      id: 'lesson',
      icon: '👨‍🏫',
      title: '레슨',
      desc: '강사 예약',
      link: '/lesson',
      gradient: 'from-orange-600/80 to-amber-500/80',
      glow: 'hover:shadow-orange-500/20',
    },
    {
      id: 'accommodation',
      icon: '🏨',
      title: '숙소',
      desc: '스키장 근처',
      link: '/accommodation',
      gradient: 'from-rose-600/80 to-pink-500/80',
      glow: 'hover:shadow-rose-500/20',
    },
  ];

  const hotDeals = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', price: 450000, originalPrice: 850000, icon: '🎿', views: 342, likes: 28 },
    { id: '8', name: 'Atomic Maverick 86 (2023)', price: 520000, originalPrice: 920000, icon: '🎿', views: 287, likes: 35 },
    { id: '2', name: 'Burton Custom (2021)', price: 380000, originalPrice: 720000, icon: '🏂', views: 256, likes: 22 },
  ];

  return (
    <div className="min-h-screen pb-24 bg-dark-900 bg-mesh">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-4 pt-10 pb-14">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 via-transparent to-neon-purple/10" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-center mb-2 animate-slide-up">
            <span className="gradient-text">⛷️ 스노우판</span>
          </h1>
          <p className="text-center text-gray-400 mb-8 animate-fade-in text-sm">
            스키 & 보드 장비의 모든 것
          </p>
          <div className="relative max-w-xl mx-auto animate-slide-up">
            <input
              type="text"
              placeholder="스키, 보드, 스키장 검색"
              className="w-full h-14 pl-5 pr-24 rounded-2xl text-base bg-dark-700/80 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/50 transition-all"
            />
            <button className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-neon-blue/25 transition-all active:scale-95">
              검색
            </button>
          </div>
        </div>
      </div>

      {/* Ad Banner Slider */}
      <div className="px-4 -mt-6 mb-4">
        <div className="relative overflow-hidden rounded-2xl glass h-24">
          {banners.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 flex items-center px-6 transition-all duration-700 ease-in-out ${
                idx === currentBanner
                  ? 'opacity-100 translate-x-0'
                  : idx < currentBanner
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`} />
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">{banner.tag}</span>
                  <h3 className={`text-base font-bold ${banner.accent}`}>{banner.title}</h3>
                </div>
                <p className="text-sm text-gray-300">{banner.desc}</p>
              </div>
            </div>
          ))}
          {/* Dots */}
          <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentBanner ? 'bg-white w-4' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, idx) => (
            <Link
              key={cat.id}
              to={cat.link}
              className={`glass rounded-2xl p-6 active:scale-95 transition-all duration-300 hover:shadow-2xl ${cat.glow} group card-hover`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
              <div className="relative">
                <div className="text-5xl mb-3 group-hover:animate-float">{cat.icon}</div>
                <div>
                  <div className="text-xl font-bold mb-1 text-white">{cat.title}</div>
                  <div className="text-sm text-gray-400">{cat.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 중고 핫딜 */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🔥 <span className="gradient-text-warm">중고 핫딜</span>
          </h2>
          <Link to="/used" className="text-sm text-neon-blue hover:text-neon-blue/80 transition-colors">
            전체보기 →
          </Link>
        </div>
        <div className="space-y-3">
          {hotDeals.map((deal) => (
            <Link
              key={deal.id}
              to={`/used/${deal.id}`}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between card-hover group block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {deal.icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-white text-sm">{deal.name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-500">👀 {deal.views}</span>
                    <span className="text-[11px] text-gray-500">❤️ {deal.likes}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-600 line-through">{deal.originalPrice.toLocaleString()}원</div>
                <div className="text-lg font-black text-neon-green">
                  {deal.price.toLocaleString()}원
                </div>
                <div className="text-[10px] text-neon-pink font-bold">
                  {Math.round((1 - deal.price / deal.originalPrice) * 100)}% OFF
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Menu */}
      <div className="px-4 mt-8">
        <h2 className="text-lg font-bold text-white mb-4">빠른 메뉴</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '💰', label: '최저가', glow: 'from-yellow-500/20 to-amber-500/20' },
            { icon: '⭐', label: '인기순', glow: 'from-blue-500/20 to-cyan-500/20' },
            { icon: '🔔', label: '알림설정', glow: 'from-purple-500/20 to-pink-500/20' },
          ].map((item) => (
            <button
              key={item.label}
              className="glass rounded-2xl p-5 text-center card-hover group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.glow} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="text-xs font-medium text-gray-300">{item.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resort Quick Select */}
      <div className="px-4 mt-8">
        <h2 className="text-lg font-bold text-white mb-4">스키장</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {['용평', '휘닉스', '하이원', '비발디', '엘리시안'].map((resort) => (
            <Link
              key={resort}
              to="/rental"
              className="flex-shrink-0 px-5 py-3 glass rounded-full font-medium text-sm text-gray-300 whitespace-nowrap hover:text-neon-blue hover:border-neon-blue/30 transition-all active:scale-95"
            >
              🏔️ {resort}
            </Link>
          ))}
        </div>
      </div>

      {/* Webcam Quick Links */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📹 <span>스키장 실시간 웹캠</span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: '용평리조트', url: 'https://www.yongpyong.co.kr/kor/skiNboard/webcam.do', gradient: 'from-blue-500/20 to-cyan-500/20' },
            { name: '휘닉스평창', url: 'https://phoenixhnr.co.kr/pyeongchang/phoenix-cam', gradient: 'from-purple-500/20 to-pink-500/20' },
            { name: '하이원리조트', url: 'https://www.high1.com/ski/webcam/liveView.do', gradient: 'from-emerald-500/20 to-green-500/20' },
            { name: '비발디파크', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.cctv.ds', gradient: 'from-orange-500/20 to-amber-500/20' },
            { name: '엘리시안강촌', url: 'https://www.elysian.co.kr/gangchon/ski/webcam.asp', gradient: 'from-rose-500/20 to-red-500/20' },
            { name: '지산리조트', url: 'https://www.jisanresort.co.kr/ski/webcam.asp', gradient: 'from-indigo-500/20 to-blue-500/20' },
          ].map((cam) => (
            <a
              key={cam.name}
              href={cam.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-2xl p-4 card-hover group relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cam.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  📹
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{cam.name}</div>
                  <div className="text-xs text-gray-500 group-hover:text-neon-blue transition-colors">실시간 보기 →</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/5 px-4 py-3 flex justify-around z-50">
        {[
          { to: '/', icon: '🏠', label: '홈', active: true },
          { to: '/used', icon: '♻️', label: '중고', active: false },
          { to: '/rental', icon: '🏔️', label: '렌탈', active: false },
          { to: '/accommodation', icon: '🏨', label: '숙소', active: false },
          { to: '/admin-approval', icon: '⚙️', label: '관리', active: false },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className={`text-xs font-medium ${item.active ? 'text-neon-blue' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
