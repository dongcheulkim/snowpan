import { useState } from 'react';
import { Link } from 'react-router-dom';

const Rental = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평리조트' },
    { id: 'phoenix', name: '휘닉스평창' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디파크' },
    { id: 'elysian', name: '엘리시안' },
  ];

  const rentalItems = [
    { id: '1', name: '스키 풀세트', resort: '용평리조트', resortId: 'yongpyong', price: 45000, duration: '1일', equipment: ['스키', '부츠', '폴'], image: '⛷️' },
    { id: '2', name: '보드 풀세트', resort: '용평리조트', resortId: 'yongpyong', price: 40000, duration: '1일', equipment: ['보드', '부츠'], image: '🏂' },
    { id: '3', name: '스키 풀세트', resort: '휘닉스평창', resortId: 'phoenix', price: 42000, duration: '1일', equipment: ['스키', '부츠', '폴'], image: '⛷️' },
    { id: '4', name: '보드 풀세트', resort: '휘닉스평창', resortId: 'phoenix', price: 38000, duration: '1일', equipment: ['보드', '부츠'], image: '🏂' },
    { id: '5', name: '스키 풀세트', resort: '하이원', resortId: 'high1', price: 40000, duration: '1일', equipment: ['스키', '부츠', '폴'], image: '⛷️' },
    { id: '6', name: '보드 풀세트', resort: '하이원', resortId: 'high1', price: 35000, duration: '1일', equipment: ['보드', '부츠'], image: '🏂' },
    { id: '7', name: '스키 풀세트', resort: '비발디파크', resortId: 'vivaldi', price: 43000, duration: '1일', equipment: ['스키', '부츠', '폴'], image: '⛷️' },
    { id: '8', name: '헬멧+고글 세트', resort: '용평리조트', resortId: 'yongpyong', price: 15000, duration: '1일', equipment: ['헬멧', '고글'], image: '⛑️' },
    { id: '9', name: '스키복 상하세트', resort: '휘닉스평창', resortId: 'phoenix', price: 25000, duration: '1일', equipment: ['상의', '하의'], image: '🧥' },
    { id: '10', name: '보드 풀세트', resort: '엘리시안', resortId: 'elysian', price: 35000, duration: '1일', equipment: ['보드', '부츠'], image: '🏂' },
  ];

  const filteredItems = selectedResort === 'all'
    ? rentalItems
    : rentalItems.filter(item => item.resortId === selectedResort);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold gradient-text">렌탈</h1>

      {/* Resort Filter */}
      <div className="glass rounded-xl p-4">
        <h2 className="text-sm font-bold mb-3 text-white">스키장 선택</h2>
        <div className="flex flex-wrap gap-2">
          {resorts.map((resort) => (
            <button
              key={resort.id}
              onClick={() => setSelectedResort(resort.id)}
              className={`px-4 py-2 rounded-lg font-medium text-xs transition-all duration-300 ${
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass rounded-xl overflow-hidden card-hover group">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-gradient-to-br from-purple-600/10 to-pink-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 group-hover:from-neon-purple/10 group-hover:to-neon-pink/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded border border-neon-purple/20 truncate">
                  {item.resort}
                </span>
                <span className="text-[10px] text-gray-500">{item.duration}</span>
              </div>
              <h3 className="text-sm font-bold mb-2 text-white">{item.name}</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {item.equipment.map((eq, index) => (
                  <span key={index} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                    {eq}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div>
                  <div className="text-[10px] text-gray-500">1일</div>
                  <span className="text-base font-bold text-neon-purple">{item.price.toLocaleString()}원</span>
                </div>
                <button className="px-3 py-1.5 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-medium text-[11px] hover:shadow-lg hover:shadow-neon-purple/25 transition-all active:scale-95">
                  예약
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500 glass rounded-xl text-sm">
          해당 스키장의 렌탈 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Rental;
