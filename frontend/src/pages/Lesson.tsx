import { useState } from 'react';

const Lesson = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평리조트' },
    { id: 'phoenix', name: '휘닉스평창' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디파크' }
  ];

  const levels = [
    { id: 'all', name: '전체' },
    { id: 'beginner', name: '초급' },
    { id: 'intermediate', name: '중급' },
    { id: 'advanced', name: '상급' }
  ];

  const lessonItems = [
    {
      id: '1',
      name: '스키 그룹레슨',
      resort: '용평리조트',
      resortId: 'yongpyong',
      price: 80000,
      duration: '2시간',
      level: 'beginner',
      levelText: '초급',
      maxStudents: 8,
      image: '⛷️'
    },
    {
      id: '2',
      name: '스키 개인레슨',
      resort: '용평리조트',
      resortId: 'yongpyong',
      price: 150000,
      duration: '2시간',
      level: 'intermediate',
      levelText: '중급',
      maxStudents: 1,
      image: '⛷️'
    },
    {
      id: '3',
      name: '보드 그룹레슨',
      resort: '휘닉스평창',
      resortId: 'phoenix',
      price: 75000,
      duration: '2시간',
      level: 'beginner',
      levelText: '초급',
      maxStudents: 6,
      image: '🏂'
    }
  ];

  const filteredItems = lessonItems.filter(item => {
    const resortMatch = selectedResort === 'all' || item.resortId === selectedResort;
    const levelMatch = selectedLevel === 'all' || item.level === selectedLevel;
    return resortMatch && levelMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">레슨</h1>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-4 text-gray-800">스키장 선택</h2>
          <div className="flex flex-wrap gap-3">
            {resorts.map((resort) => (
              <button
                key={resort.id}
                onClick={() => setSelectedResort(resort.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedResort === resort.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {resort.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4 text-gray-800">레벨 선택</h2>
          <div className="flex flex-wrap gap-3">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedLevel === level.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 레슨 상품 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 h-48 flex items-center justify-center text-6xl">
              {item.image}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  {item.resort}
                </span>
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                  {item.levelText}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{item.name}</h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">⏱️</span>
                  <span>{item.duration}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">👥</span>
                  <span>
                    {item.maxStudents === 1
                      ? '1:1 개인레슨'
                      : `최대 ${item.maxStudents}명`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">{item.duration} 기준</div>
                  <span className="text-2xl font-bold text-orange-600">
                    {item.price.toLocaleString()}원
                  </span>
                </div>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  예약하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          해당 조건의 레슨 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Lesson;
