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
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold gradient-text-warm">레슨</h1>

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
                    ? 'bg-gradient-to-r from-neon-orange to-orange-500 text-white shadow-lg shadow-neon-orange/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {resort.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <h2 className="text-base font-bold mb-4 text-white">레벨 선택</h2>
          <div className="flex flex-wrap gap-3">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                  selectedLevel === level.id
                    ? 'bg-gradient-to-r from-neon-orange to-orange-500 text-white shadow-lg shadow-neon-orange/25'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass rounded-2xl overflow-hidden card-hover group">
            <div className="relative h-48 flex items-center justify-center text-7xl bg-gradient-to-br from-orange-600/10 to-amber-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/5 to-amber-500/5 group-hover:from-neon-orange/10 group-hover:to-amber-500/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neon-orange bg-neon-orange/10 px-3 py-1.5 rounded-lg border border-neon-orange/20">
                  {item.resort}
                </span>
                <span className="text-xs font-medium text-neon-blue bg-neon-blue/10 px-3 py-1.5 rounded-lg border border-neon-blue/20">
                  {item.levelText}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">{item.name}</h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-400">
                  <span className="mr-2">⏱️</span>
                  <span>{item.duration}</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <span className="mr-2">👥</span>
                  <span>
                    {item.maxStudents === 1
                      ? '1:1 개인레슨'
                      : `최대 ${item.maxStudents}명`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-gray-500">{item.duration} 기준</div>
                  <span className="text-2xl font-bold text-neon-orange">
                    {item.price.toLocaleString()}원
                  </span>
                </div>
                <button className="px-5 py-2.5 bg-gradient-to-r from-neon-orange to-orange-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-neon-orange/25 transition-all active:scale-95">
                  예약하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-gray-500 glass rounded-2xl">
          해당 조건의 레슨 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Lesson;
