import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Accommodation = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    { title: '용평리조트 공식', desc: '스키시즌 숙박 패키지 · 리프트권 포함 특가' },
    { title: '휘닉스 블리스', desc: '얼리체크인 무료 · 스파 이용권 증정' },
    { title: '하이원 그랜드호텔', desc: '주중 40% 할인 · 곤돌라 무료 이용' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평' },
    { id: 'phoenix', name: '휘닉스' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디' },
    { id: 'elysian', name: '엘리시안' },
    { id: 'wellihilli', name: '웰리힐리' },
    { id: 'o2', name: '오투' },
    { id: 'alpensia', name: '알펜시아' },
    { id: 'konjiam', name: '곤지암' },
    { id: 'jisan', name: '지산' },
    { id: 'muju', name: '무주' },
    { id: 'oakvalley', name: '오크밸리' },
  ];

  const types = [
    { id: 'all', name: '전체' },
    { id: 'hotel', name: '호텔' },
    { id: 'pension', name: '펜션' },
    { id: 'condo', name: '콘도' },
    { id: 'minbak', name: '민박' },
  ];

  const accommodations = [
    {
      id: '1',
      name: '용평리조트 타워콘도',
      resortId: 'yongpyong',
      resort: '용평',
      type: 'condo',
      typeText: '콘도',
      price: 180000,
      originalPrice: 250000,
      rating: 4.6,
      reviewCount: 312,
      guests: '4인',
      features: ['스키장 직결', '온수풀', '조식포함'],
      image: '🏨',
    },
    {
      id: '2',
      name: '휘닉스평창 블리스힐스테이',
      resortId: 'phoenix',
      resort: '휘닉스',
      type: 'hotel',
      typeText: '호텔',
      price: 220000,
      originalPrice: 300000,
      rating: 4.8,
      reviewCount: 187,
      guests: '2인',
      features: ['도보 3분', '스파', '셔틀'],
      image: '🏩',
    },
    {
      id: '3',
      name: '하이원 마운틴콘도',
      resortId: 'high1',
      resort: '하이원',
      type: 'condo',
      typeText: '콘도',
      price: 150000,
      originalPrice: 200000,
      rating: 4.5,
      reviewCount: 245,
      guests: '4인',
      features: ['곤돌라 근처', '키친', '주차무료'],
      image: '🏔️',
    },
    {
      id: '4',
      name: '비발디파크 스위트빌라',
      resortId: 'vivaldi',
      resort: '비발디',
      type: 'pension',
      typeText: '펜션',
      price: 130000,
      originalPrice: 180000,
      rating: 4.3,
      reviewCount: 156,
      guests: '6인',
      features: ['바베큐', '넓은거실', '5분거리'],
      image: '🏡',
    },
    {
      id: '5',
      name: '엘리시안 스노우빌리지',
      resortId: 'elysian',
      resort: '엘리시안',
      type: 'minbak',
      typeText: '민박',
      price: 80000,
      originalPrice: 120000,
      rating: 4.1,
      reviewCount: 89,
      guests: '4인',
      features: ['가성비', '온돌방', '10분거리'],
      image: '🏠',
    },
    {
      id: '6',
      name: '용평 드래곤밸리호텔',
      resortId: 'yongpyong',
      resort: '용평',
      type: 'hotel',
      typeText: '호텔',
      price: 280000,
      originalPrice: 350000,
      rating: 4.9,
      reviewCount: 421,
      guests: '2인',
      features: ['5성급', '스키인/아웃', '뷔페조식'],
      image: '🌟',
    },
    {
      id: '7', name: '웰리힐리 콘도', resortId: 'wellihilli', resort: '웰리힐리',
      type: 'condo', typeText: '콘도', price: 160000, originalPrice: 220000,
      rating: 4.4, reviewCount: 198, guests: '4인',
      features: ['스키장 직결', '키친', '주차무료'], image: '🏨',
    },
    {
      id: '8', name: '오투리조트 호텔', resortId: 'o2', resort: '오투',
      type: 'hotel', typeText: '호텔', price: 140000, originalPrice: 190000,
      rating: 4.2, reviewCount: 134, guests: '2인',
      features: ['산속 힐링', '조식포함', '셔틀'], image: '🏩',
    },
    {
      id: '9', name: '알펜시아 인터컨티넨탈', resortId: 'alpensia', resort: '알펜시아',
      type: 'hotel', typeText: '호텔', price: 300000, originalPrice: 400000,
      rating: 4.9, reviewCount: 356, guests: '2인',
      features: ['5성급', '스키장 직결', '수영장'], image: '🌟',
    },
    {
      id: '10', name: '곤지암 리조트콘도', resortId: 'konjiam', resort: '곤지암',
      type: 'condo', typeText: '콘도', price: 170000, originalPrice: 230000,
      rating: 4.3, reviewCount: 267, guests: '4인',
      features: ['서울근교', '스키장 직결', '워터파크'], image: '🏨',
    },
    {
      id: '11', name: '지산 스키빌리지 펜션', resortId: 'jisan', resort: '지산',
      type: 'pension', typeText: '펜션', price: 100000, originalPrice: 150000,
      rating: 4.0, reviewCount: 112, guests: '6인',
      features: ['바베큐', '가성비', '5분거리'], image: '🏡',
    },
    {
      id: '12', name: '무주덕유산리조트 호텔', resortId: 'muju', resort: '무주',
      type: 'hotel', typeText: '호텔', price: 200000, originalPrice: 280000,
      rating: 4.6, reviewCount: 289, guests: '2인',
      features: ['온천', '스키장 직결', '뷔페조식'], image: '🏩',
    },
    {
      id: '13', name: '오크밸리 리조트콘도', resortId: 'oakvalley', resort: '오크밸리',
      type: 'condo', typeText: '콘도', price: 150000, originalPrice: 200000,
      rating: 4.4, reviewCount: 176, guests: '4인',
      features: ['골프장', '키친', '주차무료'], image: '🏔️',
    },
  ];

  const filteredItems = accommodations.filter(item => {
    const resortMatch = selectedResort === 'all' || item.resortId === selectedResort;
    const typeMatch = selectedType === 'all' || item.type === selectedType;
    return resortMatch && typeMatch;
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">숙소</h1>

      {/* Ad Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 h-24">
        {banners.map((banner, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center px-6 transition-all duration-700 ease-in-out ${
              idx === currentBanner ? 'opacity-100 translate-x-0' : idx < currentBanner ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
            }`}
          >
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-bold bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">AD</span>
                <h3 className="text-base font-bold text-white">{banner.title}</h3>
              </div>
              <p className="text-sm text-zinc-400">{banner.desc}</p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
          {banners.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-accent w-4' : 'bg-zinc-600'}`} />
          ))}
        </div>
      </div>

      {/* Resort Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {resorts.map((resort) => (
          <button
            key={resort.id}
            onClick={() => setSelectedResort(resort.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedResort === resort.id
                ? 'bg-accent text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
            }`}
          >
            {resort.name}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
              selectedType === type.id
                ? 'bg-accent text-white'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-gray-300 border border-zinc-800'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Accommodation List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => (
          <Link to={`/accommodation/${item.id}`} key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all group block">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-zinc-950">
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
              <span className="absolute top-2 right-2 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-800">
                {item.typeText}
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800">
                  {item.resort}
                </span>
                <span className="text-[10px] text-zinc-500">{item.guests}</span>
              </div>
              <h3 className="text-sm font-bold text-white truncate mb-1.5">{item.name}</h3>

              <div className="flex items-center gap-1 mb-2">
                <span className="text-gold text-[10px]">★</span>
                <span className="text-[10px] text-zinc-500">{item.rating} ({item.reviewCount})</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {item.features.map((feature, idx) => (
                  <span key={idx} className="text-[10px] bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-end pt-2 border-t border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-600 line-through">{item.originalPrice.toLocaleString()}원</div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold text-mint">{item.price.toLocaleString()}원</span>
                    <span className="text-[10px] text-coral font-bold">
                      {Math.round((1 - item.price / item.originalPrice) * 100)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">1박</div>
                </div>
                <button className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium text-[11px] hover:bg-accent-light transition-all active:scale-95">
                  예약
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
          해당 조건의 숙소 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Accommodation;
