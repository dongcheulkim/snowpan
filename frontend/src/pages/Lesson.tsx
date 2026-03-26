import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';

interface LessonItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  level: string;
  maxStudents: number;
  image: string;
  resort?: { id: string; name: string };
}

interface Resort {
  id: string;
  name: string;
}

const Lesson = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);

  const [banners, setBanners] = useState<{ title: string; desc: string }[]>([]);

  useEffect(() => {
    api<any[]>('/ad-booking/active?slotType=category&category=lesson')
      .then(ads => setBanners(ads.map(a => ({ title: a.title, desc: a.description }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  const levels = [
    { id: 'all', name: '전체' },
    { id: 'lv1', name: 'LV1' },
    { id: 'lv2', name: 'LV2' },
    { id: 'lv3', name: 'LV3' },
    { id: 'demo', name: '데몬' },
  ];

  useEffect(() => {
    api<LessonItem[]>('/lessons').then(setLessonItems).catch(() => {});
  }, []);

  const levelMap: Record<string, string> = { beginner: 'lv1', intermediate: 'lv2', advanced: 'lv3' };
  const filteredItems = lessonItems.filter(item => {
    const resortMatch = selectedResort === 'all' || item.resort?.id === selectedResort;
    const mappedLevel = levelMap[item.level] || item.level;
    const levelMatch = selectedLevel === 'all' || mappedLevel === selectedLevel;
    return resortMatch && levelMatch;
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">레슨</h1>
        <Link to="/lesson/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors">+ 등록</Link>
      </div>

      {/* Ad Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 h-24">
        {banners.length > 0 ? (
          <>
            {banners.map((banner, idx) => (
              <div key={idx} className={`absolute inset-0 flex items-center px-6 transition-all duration-700 ease-in-out ${idx === currentBanner ? 'opacity-100 translate-x-0' : idx < currentBanner ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">AD</span>
                    <h3 className="text-base font-bold text-gray-900">{banner.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{banner.desc}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-accent w-4' : 'bg-gray-400'}`} />
              ))}
            </div>
          </>
        ) : (
          <Link to="/ad-booking" className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-lg">📢</span>
            <span className="text-xs font-bold text-primary-dark">광고를 신청해보세요!</span>
            <span className="text-[10px] text-gray-400">이 자리에 내 광고가 노출됩니다</span>
          </Link>
        )}
      </div>

      {/* Resort Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: '전체' }, ...resorts].map((resort) => (
          <button
            key={resort.id}
            onClick={() => setSelectedResort(resort.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedResort === resort.id
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
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
                : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'
            }`}
          >
            {level.name}
          </button>
        ))}
      </div>

      {/* Lesson Items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => (
          <Link to={`/lesson/${item.id}`} key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group block hover:border-gray-400 transition-colors">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
              {item.image.startsWith('/') || item.image.startsWith('http') ? (
                <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate">
                  {item.resort?.name || ''}
                </span>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  {item.level === 'beginner' ? 'LV1' : item.level === 'intermediate' ? 'LV2' : item.level === 'advanced' ? 'LV3' : item.level}
                </span>
              </div>
              <h3 className="text-sm font-bold mb-2 text-gray-900">{item.name}</h3>
              <div className="flex items-center gap-3 mb-2 text-[11px] text-gray-400">
                <span>{item.duration}</span>
                <span>{item.maxStudents === 1 ? '1:1' : `${item.maxStudents}명`}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-400">{item.duration}</div>
                  <span className="text-base font-bold text-mint">{item.price.toLocaleString()}원</span>
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
        <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl text-sm">
          해당 조건의 레슨 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Lesson;
