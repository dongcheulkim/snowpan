import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import RegisterCTA from '../components/RegisterCTA';
import CategoryAdBanner from '../components/CategoryAdBanner';
import { toastError } from '../components/Toast';

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

const PAGE_SIZE = 12;

const Lesson = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resorts, setResorts] = useState<Resort[]>([]);

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

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedResort, selectedLevel]);

  // 레벨 필터 → 백엔드 level 값으로 변환
  const levelToBackend: Record<string, string> = { lv1: 'beginner', lv2: 'intermediate', lv3: 'advanced', demo: 'demo' };

  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedResort !== 'all') params.set('resortId', selectedResort);
        if (selectedLevel !== 'all') {
          const backendLevel = levelToBackend[selectedLevel];
          if (backendLevel) params.set('level', backendLevel);
        }
        const data = await api<{ items: LessonItem[]; totalCount: number }>(`/lessons?${params}`);
        setLessonItems(data.items);
        setTotalCount(data.totalCount);
      } catch (err) {
        setLessonItems([]);
        setTotalCount(0);
        toastError(err instanceof Error ? err.message : '레슨 목록을 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResort, selectedLevel, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">레슨</h1>
        <RegisterCTA to="/lesson/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer">+ 등록</RegisterCTA>
      </div>

      <CategoryAdBanner category="lesson" />

      {/* Resort Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: '전체' }, ...resorts].map((resort) => (
          <button
            key={resort.id}
            onClick={() => setSelectedResort(resort.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedResort === resort.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
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
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'
            }`}
          >
            {level.name}
          </button>
        ))}
      </div>

      {/* Lesson Items */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {lessonItems.map((item) => (
            <Link to={`/lesson/${item.id}`} key={item.id} className="bg-snow border border-gray-200 rounded-xl overflow-hidden group block hover:border-gray-400 transition-colors">
              <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
                {item.image.startsWith('/') || item.image.startsWith('http') ? (
                  <img src={imageUrl(item.image, 400)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={e => { const i = e.target as HTMLImageElement; if (!i.dataset.fallback) { i.dataset.fallback = '1'; i.src = '/icons/placeholder-card.svg'; } }} />
                ) : (
                  <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate">
                    {item.resort?.name || ''}
                  </span>
                  <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    {item.level === 'beginner' ? 'LV1' : item.level === 'intermediate' ? 'LV2' : item.level === 'advanced' ? 'LV3' : item.level}
                  </span>
                </div>
                <h3 className="text-sm font-bold mb-2 text-gray-900">{item.name}</h3>
                <div className="flex items-center gap-3 mb-2 text-[11px] text-gray-500">
                  <span>{item.duration}</span>
                  <span>{item.maxStudents === 1 ? '1:1' : `${item.maxStudents}명`}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div>
                    <div className="text-[10px] text-gray-500">{item.duration}</div>
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
      )}

      {!loading && lessonItems.length === 0 && (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="3"/><path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 레슨이 없어요</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            강사·자격을 가진 분이라면 첫 등록자가 되어<br/>레슨생을 만나보세요. 베타 기간 등록 무료입니다.
          </p>
          <Link to="/lesson/register" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
            + 첫 레슨 등록하기
          </Link>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Lesson;
