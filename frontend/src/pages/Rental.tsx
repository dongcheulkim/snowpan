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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">렌탈</h1>
      </div>

      {/* 스키장 필터 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold mb-4 text-gray-800">스키장 선택</h2>
        <div className="flex flex-wrap gap-3">
          {resorts.map((resort) => (
            <button
              key={resort.id}
              onClick={() => setSelectedResort(resort.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedResort === resort.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {resort.name}
            </button>
          ))}
        </div>
      </div>

      {/* 렌탈 상품 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 h-48 flex items-center justify-center text-6xl">
              {item.image}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                  {item.resort}
                </span>
                <span className="text-sm text-gray-500">{item.duration}</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{item.name}</h3>
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">포함 장비:</div>
                <div className="flex flex-wrap gap-2">
                  {item.equipment.map((eq, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">1일 기준</div>
                  <span className="text-2xl font-bold text-purple-600">
                    {item.price.toLocaleString()}원
                  </span>
                </div>
                <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  예약하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          해당 스키장의 렌탈 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Rental;
