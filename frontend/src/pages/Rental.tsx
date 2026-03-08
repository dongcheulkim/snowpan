import { useState } from 'react';

const Rental = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평리조트' },
    { id: 'phoenix', name: '휘닉스평창' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디파크' }
  ];

  const rentalItems = [
    {
      id: '1',
      name: '스키 풀세트',
      resort: '용평리조트',
      resortId: 'yongpyong',
      price: 45000,
      duration: '1일',
      equipment: ['스키', '부츠', '폴'],
      image: '⛷️'
    },
    {
      id: '2',
      name: '보드 풀세트',
      resort: '용평리조트',
      resortId: 'yongpyong',
      price: 40000,
      duration: '1일',
      equipment: ['보드', '부츠'],
      image: '🏂'
    },
    {
      id: '3',
      name: '스키 풀세트',
      resort: '휘닉스평창',
      resortId: 'phoenix',
      price: 42000,
      duration: '1일',
      equipment: ['스키', '부츠', '폴'],
      image: '⛷️'
    }
  ];

  const filteredItems = selectedResort === 'all'
    ? rentalItems
    : rentalItems.filter(item => item.resortId === selectedResort);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold gradient-text">렌탈</h1>

      {/* Resort Filter */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-base font-bold mb-4 text-white">스키장 선택</h2>
        <div className="flex flex-wrap gap-3">
          {resorts.map((resort) => (
            <button
              key={resort.id}
              onClick={() => setSelectedResort(resort.id)}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                selectedResort === resort.id
                  ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {resort.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rental Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass rounded-2xl overflow-hidden card-hover group">
            <div className="relative h-48 flex items-center justify-center text-7xl bg-gradient-to-br from-purple-600/10 to-pink-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 group-hover:from-neon-purple/10 group-hover:to-neon-pink/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neon-purple bg-neon-purple/10 px-3 py-1.5 rounded-lg border border-neon-purple/20">
                  {item.resort}
                </span>
                <span className="text-xs text-gray-500">{item.duration}</span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">{item.name}</h3>
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">포함 장비</div>
                <div className="flex flex-wrap gap-2">
                  {item.equipment.map((eq, index) => (
                    <span key={index} className="text-xs bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-white/5">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-gray-500">1일 기준</div>
                  <span className="text-2xl font-bold text-neon-purple">
                    {item.price.toLocaleString()}원
                  </span>
                </div>
                <button className="px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-neon-purple/25 transition-all active:scale-95">
                  예약하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-gray-500 glass rounded-2xl">
          해당 스키장의 렌탈 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Rental;
