import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Lesson = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentBanner, setCurrentBanner] = useState(0);

  const banners = [
    { title: '스키아카데미 용평', desc: '전 국가대표 출신 강사진 · 초급반 특가' },
    { title: '보드캠프 휘닉스', desc: '3일 집중 캠프 30% 할인 · 숙소 패키지' },
    { title: '프로레슨 하이원', desc: '1:1 영상분석 레슨 · 실력 보장 프로그램' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const resorts = [
    { id: 'all', name: '전체' },
    { id: 'yongpyong', name: '용평리조트' },
    { id: 'phoenix', name: '휘닉스평창' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디파크' },
    { id: 'elysian', name: '엘리시안' },
    { id: 'wellihilli', name: '웰리힐리' },
    { id: 'o2', name: '오투리조트' },
    { id: 'alpensia', name: '알펜시아' },
    { id: 'konjiam', name: '곤지암' },
    { id: 'jisan', name: '지산' },
    { id: 'muju', name: '무주' },
    { id: 'oakvalley', name: '오크밸리' },
  ];

  const levels = [
    { id: 'all', name: '전체' },
    { id: 'lv1', name: 'LV1' },
    { id: 'lv2', name: 'LV2' },
    { id: 'lv3', name: 'LV3' },
    { id: 'demo', name: '데몬' },
  ];

  const lessonItems = [
    { id: '1', name: '스키 그룹레슨', resort: '용평리조트', resortId: 'yongpyong', price: 80000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️' },
    { id: '2', name: '스키 개인레슨', resort: '용평리조트', resortId: 'yongpyong', price: 150000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '⛷️' },
    { id: '3', name: '보드 그룹레슨', resort: '휘닉스평창', resortId: 'phoenix', price: 75000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 6, image: '🏂' },
    { id: '4', name: '보드 개인레슨', resort: '휘닉스평창', resortId: 'phoenix', price: 140000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '🏂' },
    { id: '5', name: '스키 LV3반', resort: '하이원', resortId: 'high1', price: 200000, duration: '3시간', level: 'lv3', levelText: 'LV3', maxStudents: 4, image: '⛷️' },
    { id: '6', name: '보드 그룹레슨', resort: '하이원', resortId: 'high1', price: 70000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '🏂' },
    { id: '7', name: '스키 그룹레슨', resort: '비발디파크', resortId: 'vivaldi', price: 75000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 10, image: '⛷️' },
    { id: '8', name: '보드 개인레슨', resort: '비발디파크', resortId: 'vivaldi', price: 130000, duration: '2시간', level: 'lv3', levelText: 'LV3', maxStudents: 1, image: '🏂' },
    { id: '9', name: '스키 그룹레슨', resort: '엘리시안', resortId: 'elysian', price: 70000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️' },
    { id: '10', name: '보드 그룹레슨', resort: '웰리힐리', resortId: 'wellihilli', price: 75000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '🏂' },
    { id: '11', name: '스키 개인레슨', resort: '웰리힐리', resortId: 'wellihilli', price: 140000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '⛷️' },
    { id: '12', name: '스키 그룹레슨', resort: '오투리조트', resortId: 'o2', price: 65000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 6, image: '⛷️' },
    { id: '13', name: '보드 개인레슨', resort: '오투리조트', resortId: 'o2', price: 130000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '🏂' },
    { id: '14', name: '스키 그룹레슨', resort: '알펜시아', resortId: 'alpensia', price: 85000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 6, image: '⛷️' },
    { id: '15', name: '스키 데몬반', resort: '알펜시아', resortId: 'alpensia', price: 250000, duration: '3시간', level: 'demo', levelText: '데몬', maxStudents: 4, image: '⛷️' },
    { id: '16', name: '스키 그룹레슨', resort: '곤지암', resortId: 'konjiam', price: 78000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️' },
    { id: '17', name: '보드 개인레슨', resort: '곤지암', resortId: 'konjiam', price: 145000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '🏂' },
    { id: '18', name: '스키 그룹레슨', resort: '지산', resortId: 'jisan', price: 70000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 10, image: '⛷️' },
    { id: '19', name: '보드 그룹레슨', resort: '지산', resortId: 'jisan', price: 68000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '🏂' },
    { id: '20', name: '스키 그룹레슨', resort: '무주', resortId: 'muju', price: 80000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️' },
    { id: '21', name: '스키 데몬반', resort: '무주', resortId: 'muju', price: 240000, duration: '3시간', level: 'demo', levelText: '데몬', maxStudents: 2, image: '⛷️' },
    { id: '22', name: '스키 그룹레슨', resort: '오크밸리', resortId: 'oakvalley', price: 72000, duration: '2시간', level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️' },
    { id: '23', name: '보드 개인레슨', resort: '오크밸리', resortId: 'oakvalley', price: 135000, duration: '2시간', level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '🏂' },
  ];

  const filteredItems = lessonItems.filter(item => {
    const resortMatch = selectedResort === 'all' || item.resortId === selectedResort;
    const levelMatch = selectedLevel === 'all' || item.level === selectedLevel;
    return resortMatch && levelMatch;
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">레슨</h1>

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

      {/* Level Filter */}
      <div className="flex gap-2">
        {levels.map((level) => (
          <button
            key={level.id}
            onClick={() => setSelectedLevel(level.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
              selectedLevel === level.id
                ? 'bg-accent text-white'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800'
            }`}
          >
            {level.name}
          </button>
        ))}
      </div>

      {/* Lesson Items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => (
          <Link to={`/lesson/${item.id}`} key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group block hover:border-zinc-600 transition-colors">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-zinc-950">
              <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800 truncate">
                  {item.resort}
                </span>
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800">
                  {item.levelText}
                </span>
              </div>
              <h3 className="text-sm font-bold mb-2 text-white">{item.name}</h3>
              <div className="flex items-center gap-3 mb-2 text-[11px] text-zinc-500">
                <span>{item.duration}</span>
                <span>{item.maxStudents === 1 ? '1:1' : `${item.maxStudents}명`}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-500">{item.duration}</div>
                  <span className="text-base font-bold text-white">{item.price.toLocaleString()}원</span>
                </div>
                <button className="px-3 py-1.5 bg-white text-black rounded-lg font-medium text-[11px] hover:bg-gray-200 transition-all active:scale-95">
                  예약
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-[#111] border border-[#1f1f1f] rounded-xl text-sm">
          해당 조건의 레슨 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Lesson;
