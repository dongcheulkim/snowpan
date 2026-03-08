import { useState } from 'react';

const Accommodation = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평' },
    { id: 'phoenix', name: '휘닉스' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디' },
    { id: 'elysian', name: '엘리시안' },
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
      features: ['스키장 도보 3분', '스파', '셔틀버스'],
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
      features: ['바베큐', '넓은거실', '스키장 5분'],
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
      features: ['가성비', '온돌방', '스키장 10분'],
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
  ];

  const filteredItems = accommodations.filter(item => {
    const resortMatch = selectedResort === 'all' || item.resortId === selectedResort;
    const typeMatch = selectedType === 'all' || item.type === selectedType;
    return resortMatch && typeMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold gradient-text">숙소</h1>

      {/* Filters */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold mb-4 text-white">스키장 선택</h2>
          <div className="flex flex-wrap gap-3">
            {resorts.map((resort) => (
              <button
                key={resort.id}
                onClick={() => setSelectedResort(resort.id)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                  selectedResort === resort.id
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {resort.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <h2 className="text-base font-bold mb-4 text-white">숙소 유형</h2>
          <div className="flex flex-wrap gap-3">
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                  selectedType === type.id
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accommodation List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass rounded-2xl overflow-hidden card-hover group">
            <div className="relative h-48 flex items-center justify-center text-7xl bg-gradient-to-br from-rose-600/10 to-pink-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 group-hover:from-rose-500/10 group-hover:to-pink-500/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
              <span className="absolute top-4 right-4 bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/30">
                {item.typeText}
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                  {item.resort}
                </span>
                <span className="text-xs text-gray-500">{item.guests} 기준</span>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{item.name}</h3>

              <div className="flex items-center mb-3">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-xs ${i < Math.floor(item.rating) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                  ))}
                </div>
                <span className="ml-2 text-xs text-gray-500">
                  {item.rating} ({item.reviewCount})
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {item.features.map((feature, idx) => (
                  <span key={idx} className="text-xs bg-white/5 text-gray-400 px-2.5 py-1 rounded-lg border border-white/5">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-gray-600 line-through mb-0.5">
                    {item.originalPrice.toLocaleString()}원
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-rose-400">
                      {item.price.toLocaleString()}원
                    </span>
                    <span className="text-xs text-neon-pink font-bold">
                      {Math.round((1 - item.price / item.originalPrice) * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">1박 기준</div>
                </div>
                <button className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-rose-500/25 transition-all active:scale-95">
                  예약하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-gray-500 glass rounded-2xl">
          해당 조건의 숙소 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Accommodation;
