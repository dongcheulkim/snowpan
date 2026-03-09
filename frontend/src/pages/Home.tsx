import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    { title: '보드팩토리 강남점', desc: '시즌 오픈 전 장비 튜닝 50% 할인 이벤트', tag: 'AD' },
    { title: '스키프로샵 홍대점', desc: '24/25 신상 부츠 피팅 무료 · 장비 풀세트 특가', tag: 'AD' },
    { title: '라이더스클럽 판교점', desc: '중고 장비 위탁판매 수수료 0% · 왁싱 서비스', tag: 'AD' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = [
    { id: 'used', title: '중고', desc: '합리적 가격', link: '/used', color: 'text-mint' },
    { id: 'rental', title: '렌탈', desc: '스키장별', link: '/rental', color: 'text-accent-light' },
    { id: 'lesson', title: '레슨', desc: '강사 예약', link: '/lesson', color: 'text-gold' },
    { id: 'accommodation', title: '숙소', desc: '스키장 근처', link: '/accommodation', color: 'text-coral' },
    { id: 'community', title: '커뮤니티', desc: '소통 & 정보', link: '/community', color: 'text-purple-400' },
  ];

  const hotDeals = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', price: 450000, views: 342, likes: 28 },
    { id: '8', name: 'Atomic Maverick 86 (2023)', price: 520000, views: 287, likes: 35 },
    { id: '2', name: 'Burton Custom (2021)', price: 380000, views: 256, likes: 22 },
  ];

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Hero */}
      <div className="px-4 pt-10 pb-12">
        <h1 className="text-3xl font-black text-center text-gray-900 mb-2 animate-slide-up">
          <span className="text-accent-light">스노우</span>판
        </h1>
        <p className="text-center text-gray-400 mb-8 animate-fade-in text-sm">
          스키 & 보드 장비의 모든 것
        </p>
        <div className="relative max-w-xl mx-auto animate-slide-up">
          <input
            type="text"
            placeholder="스키, 보드, 스키장 검색"
            className="w-full h-12 pl-4 pr-20 rounded-xl text-sm bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
          />
          <button className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors">
            검색
          </button>
        </div>
      </div>

      {/* Ad Banner */}
      <div className="px-4 mb-6">
        <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 h-20">
          {banners.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 flex items-center px-5 transition-all duration-700 ease-in-out ${
                idx === currentBanner
                  ? 'opacity-100 translate-x-0'
                  : idx < currentBanner
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold bg-accent/10 text-accent-light px-1.5 py-0.5 rounded">{banner.tag}</span>
                  <h3 className="text-sm font-bold text-gray-900">{banner.title}</h3>
                </div>
                <p className="text-xs text-gray-500">{banner.desc}</p>
              </div>
            </div>
          ))}
          <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentBanner ? 'bg-accent-light w-4' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="card p-5 active:scale-[0.98] transition-all hover:border-gray-400"
            >
              <div className={`text-lg font-bold mb-1 ${cat.color}`}>{cat.title}</div>
              <div className="text-xs text-gray-400">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 중고 핫딜 */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">중고 핫딜</h2>
          <Link to="/used" className="text-sm text-accent-light hover:text-accent transition-colors">
            전체보기 →
          </Link>
        </div>
        <div className="space-y-2">
          {hotDeals.map((deal) => (
            <Link
              key={deal.id}
              to={`/used/${deal.id}`}
              className="w-full card p-4 flex items-center justify-between card-hover block"
            >
              <div>
                <div className="font-bold text-gray-900 text-sm">{deal.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-gray-400">조회 {deal.views}</span>
                  <span className="text-[11px] text-gray-400">찜 {deal.likes}</span>
                </div>
              </div>
              <div className="text-base font-black text-mint">
                {deal.price.toLocaleString()}원
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Resort Quick Select */}
      <div className="px-4 mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">스키장</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['용평', '휘닉스', '하이원', '비발디', '엘리시안', '웰리힐리', '오투', '알펜시아', '곤지암', '지산', '무주', '오크밸리', '에덴밸리'].map((resort) => (
            <Link
              key={resort}
              to="/rental"
              className="flex-shrink-0 px-4 py-2 card text-sm text-gray-500 whitespace-nowrap hover:text-accent-light hover:border-accent/50 transition-all"
            >
              {resort}
            </Link>
          ))}
        </div>
      </div>

      {/* Webcam Quick Links */}
      <div className="px-4 mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">스키장 실시간 웹캠</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: '용평리조트', url: 'https://www.yongpyong.co.kr/kor/skiNboard/webcam.do' },
            { name: '휘닉스평창', url: 'https://phoenixhnr.co.kr/pyeongchang/phoenix-cam' },
            { name: '하이원리조트', url: 'https://www.high1.com/ski/webcam/liveView.do' },
            { name: '비발디파크', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.cctv.ds' },
            { name: '엘리시안강촌', url: 'https://www.elysian.co.kr/gangchon/ski/webcam.asp' },
            { name: '지산리조트', url: 'https://www.jisanresort.co.kr/ski/webcam.asp' },
            { name: '무주덕유산', url: 'https://www.mdysresort.com/ski/webcam.do' },
            { name: '오크밸리', url: 'https://www.oakvalley.co.kr/ski/webcam.asp' },
            { name: '웰리힐리파크', url: 'https://www.wellihillipark.com/ski/webcam' },
            { name: '오투리조트', url: 'https://www.o2resort.com/ski/webcam.asp' },
            { name: '알펜시아', url: 'https://www.alpensia.com/ski/webcam.asp' },
            { name: '곤지암리조트', url: 'https://www.konjiamresort.co.kr/ski/webcam.asp' },
            { name: '에덴밸리', url: 'https://www.edenvalley.co.kr/ski/webcam.asp' },
          ].map((cam) => (
            <a
              key={cam.name}
              href={cam.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-3.5 card-hover"
            >
              <div className="text-sm font-medium text-gray-900">{cam.name}</div>
              <div className="text-xs text-accent-light mt-0.5">실시간 보기 →</div>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 flex justify-around z-50">
        {[
          { to: '/', label: '홈', active: true },
          { to: '/used', label: '중고', active: false },
          { to: '/rental', label: '렌탈', active: false },
          { to: '/accommodation', label: '숙소', active: false },
          { to: '/admin-approval', label: '관리', active: false },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1">
            <span className={`text-xs font-medium ${item.active ? 'text-accent-light' : 'text-gray-400 hover:text-gray-500'} transition-colors`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
