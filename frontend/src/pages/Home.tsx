import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [currentWebcam, setCurrentWebcam] = useState(0);
  const banners = [
    {
      title: '시즌 장비 튜닝 50% 할인',
      desc: '보드팩토리 강남점 · 지금 바로 예약하세요',
      gradient: 'from-primary to-pink-400',
      tag: '이벤트',
    },
    {
      title: '24/25 신상 부츠 피팅 무료',
      desc: '스키프로샵 홍대점 · 장비 풀세트 특가',
      gradient: 'from-violet-500 to-purple-400',
      tag: '신상',
    },
    {
      title: '중고 위탁판매 수수료 0%',
      desc: '라이더스클럽 판교점 · 왁싱 서비스 포함',
      gradient: 'from-blue-500 to-cyan-400',
      tag: '특가',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = [
    { id: 'used', title: '중고거래', icon: '🏷️', link: '/used', bg: 'bg-orange-50', color: 'text-orange-500' },
    { id: 'rental', title: '렌탈', icon: '⛷️', link: '/rental', bg: 'bg-blue-50', color: 'text-blue-500' },
    { id: 'lesson', title: '레슨', icon: '🎿', link: '/lesson', bg: 'bg-green-50', color: 'text-green-500' },
    { id: 'accommodation', title: '숙소', icon: '🏨', link: '/accommodation', bg: 'bg-purple-50', color: 'text-purple-500' },
    { id: 'community', title: '커뮤니티', icon: '💬', link: '/community', bg: 'bg-pink-50', color: 'text-pink-500' },
  ];

  const hotDeals = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', price: 450000, originalPrice: 680000, views: 342, likes: 28, tag: '인기' },
    { id: '8', name: 'Atomic Maverick 86 (2023)', price: 520000, originalPrice: 850000, views: 287, likes: 35, tag: 'HOT' },
    { id: '2', name: 'Burton Custom (2021)', price: 380000, originalPrice: 620000, views: 256, likes: 22, tag: '급처' },
  ];

  const webcams = [
    { name: '용평리조트', url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do', region: '강원' },
    { name: '휘닉스평창', url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie', region: '강원' },
    { name: '하이원리조트', url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p', region: '강원' },
    { name: '비발디파크', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.04_02_04.ds/dmparse.dm', region: '강원' },
    { name: '엘리시안강촌', url: 'https://www.elysian.co.kr/gangchon/ski/ski_slope03.asp', region: '강원' },
    { name: '지산리조트', url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp', region: '경기' },
    { name: '무주덕유산', url: 'https://www.mdysresort.com/guide/webcam.asp', region: '전북' },
    { name: '오크밸리', url: 'https://oakvalley.co.kr/ski/introduction/realtime', region: '강원' },
    { name: '웰리힐리파크', url: 'https://www.wellihillipark.com/home/customer/webcam', region: '강원' },
    { name: '오투리조트', url: 'https://www.o2resort.com/GDE/webcam.jsp', region: '강원' },
    { name: '알펜시아', url: 'https://www.alpensia.com/guide/web-cam.do', region: '강원' },
    { name: '곤지암리조트', url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev', region: '경기' },
    { name: '에덴밸리', url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp', region: '경남' },
  ];

  const itemsPerPage = 4;
  const totalPages = Math.ceil(webcams.length / itemsPerPage);
  const pagedWebcams = webcams.slice(currentWebcam * itemsPerPage, (currentWebcam + 1) * itemsPerPage);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light px-5 pt-12 pb-8">
        <h1 className="text-2xl font-black text-white mb-1 animate-slide-up">
          스노우판
        </h1>
        <p className="text-white/70 text-sm mb-5 animate-fade-in">
          스키 & 보드 장비의 모든 것
        </p>
        <div className="relative animate-slide-up">
          <input
            type="text"
            placeholder="스키, 보드, 스키장 검색"
            className="w-full h-12 pl-12 pr-4 rounded-2xl text-sm bg-white/95 border-none text-gray-800 placeholder-gray-400 shadow-lg"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Banner Carousel */}
      <div className="px-4 -mt-3">
        <div className="relative overflow-hidden rounded-2xl h-24 shadow-md">
          {banners.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} flex items-center px-5 transition-all duration-700 ease-in-out ${
                idx === currentBanner
                  ? 'opacity-100 translate-x-0'
                  : idx < currentBanner
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">{banner.tag}</span>
                </div>
                <h3 className="text-base font-bold text-white">{banner.title}</h3>
                <p className="text-xs text-white/80 mt-0.5">{banner.desc}</p>
              </div>
            </div>
          ))}
          <div className="absolute bottom-2.5 right-4 bg-black/30 text-white text-[10px] px-2.5 py-0.5 rounded-full z-10">
            {currentBanner + 1} / {banners.length}
          </div>
        </div>
      </div>

      {/* Category Icons */}
      <div className="px-4 mt-6">
        <div className="flex justify-between">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 ${cat.bg} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-gray-700">{cat.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-2 bg-gray-50 mt-6" />

      {/* Hot Deals */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">지금 뜨는 핫딜</h2>
            <span className="text-[10px] font-bold bg-primary-50 text-primary px-2 py-0.5 rounded-full">BEST</span>
          </div>
          <Link to="/used" className="text-sm text-gray-400 hover:text-primary transition-colors">
            더보기
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {hotDeals.map((deal) => {
            const discount = Math.round((1 - deal.price / deal.originalPrice) * 100);
            return (
              <Link
                key={deal.id}
                to={`/used/${deal.id}`}
                className="min-w-[160px] card p-4 card-hover flex-shrink-0"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">{deal.tag}</span>
                </div>
                <div className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2">{deal.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-primary">{discount}%</span>
                  <span className="text-base font-bold text-gray-900">{deal.price.toLocaleString()}원</span>
                </div>
                <div className="text-xs text-gray-300 line-through mt-0.5">{deal.originalPrice.toLocaleString()}원</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-gray-400">조회 {deal.views}</span>
                  <span className="text-[11px] text-gray-400">♥ {deal.likes}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-2 bg-gray-50 mt-5" />

      {/* Webcam Slide */}
      <div className="px-4 mt-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">실시간 웹캠</h2>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentWebcam((prev) => Math.max(0, prev - 1))}
              disabled={currentWebcam === 0}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                currentWebcam === 0
                  ? 'bg-gray-50 text-gray-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              ‹
            </button>
            <span className="text-xs text-gray-400 min-w-[32px] text-center">{currentWebcam + 1}/{totalPages}</span>
            <button
              onClick={() => setCurrentWebcam((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentWebcam === totalPages - 1}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                currentWebcam === totalPages - 1
                  ? 'bg-gray-50 text-gray-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {pagedWebcams.map((cam) => (
            <a
              key={cam.name}
              href={cam.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 card-hover group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{cam.name}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cam.region}</span>
              </div>
              <div className="text-xs text-primary mt-1 font-medium">실시간 보기 →</div>
            </a>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentWebcam(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentWebcam ? 'bg-primary w-5' : 'bg-gray-200 w-2'
              }`}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;
