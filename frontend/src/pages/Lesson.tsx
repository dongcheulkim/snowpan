import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import RegisterCTA from '../components/RegisterCTA';
import CategoryAdBanner from '../components/CategoryAdBanner';
import { toastError } from '../components/Toast';
import { SkiIcon, SnowboardIcon } from '../components/Icons';
import { useVertical } from '../hooks/useVertical';
import { PosterGridSkeleton } from '../components/Skeleton';
import HScroll from '../components/HScroll';
import { RESORT_REGION_ORDER, resortRegion } from '../utils/resortRegion';

interface LessonItem {
  id: string;
  name: string;
  type?: string | null;
  specialties?: string | null;
  image?: string | null;
  images?: string | null;
  resort?: { id: string; name: string } | null;
}

interface Resort {
  id: string;
  name: string;
  location?: string | null;
}

const PAGE_SIZE = 12;

// 강습 분야 필터 — 백엔드 화이트리스트와 1:1
const SPECIALTIES = ['초중급', '인터', '레이싱', '모글', '파크', '키즈'];

const Lesson = () => {
  const vertical = useVertical();
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedSpec, setSelectedSpec] = useState<string>('all');
  const [sport, setSport] = useState<'스키' | '보드'>('스키');
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resorts, setResorts] = useState<Resort[]>([]);
  // 지역(대분류) → 리조트(소분류) 2단계 — 리조트 칩이 길어 한 줄로 못 담던 것
  const [selectedRegion, setSelectedRegion] = useState('all');

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedResort, selectedRegion, selectedSpec, sport]);

  const reqSeqRef = useRef(0); // 필터 변경 직후 페이지리셋 이펙트와 겹치는 요청 레이스 방지
  useEffect(() => {
    const seq = ++reqSeqRef.current;
    const fetchLessons = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        params.set('type', sport);
        if (selectedResort !== 'all') {
          params.set('resortId', selectedResort);
        } else if (selectedRegion !== 'all') {
          const ids = resorts.filter((r) => resortRegion(r.location) === selectedRegion).map((r) => r.id);
          if (ids.length) params.set('resortId', ids.join(','));
        }
        if (selectedSpec !== 'all') params.set('specialty', selectedSpec);
        const data = await api<{ items: LessonItem[]; totalCount: number }>(`/lessons?${params}`);
        if (seq !== reqSeqRef.current) return; // 늦게 도착한 이전 요청 무시
        setLessonItems(data.items);
        setTotalCount(data.totalCount);
      } catch (err) {
        if (seq !== reqSeqRef.current) return;
        setLessonItems([]);
        setTotalCount(0);
        toastError(err instanceof Error ? err.message : '레슨 목록을 불러오지 못했습니다');
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    };
    fetchLessons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResort, selectedRegion, resorts, selectedSpec, sport, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.lesson || '레슨'}</h1>
        <RegisterCTA to="/lesson/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer">+ 등록</RegisterCTA>
      </div>

      <CategoryAdBanner category="lesson" />

      {/* 스키/보드 레슨 시장 분리 — 커뮤니티 종목 탭과 동일 컨셉. 겸용(스키·보드) 레슨은 양쪽 노출 */}
      <div className="grid grid-cols-2 gap-2">
        {(['스키', '보드'] as const).map((sp) => (
          <button
            key={sp}
            onClick={() => setSport(sp)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              sport === sp ? 'bg-accent text-white' : 'bg-snow text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {sp === '스키' ? <SkiIcon size={16} /> : <SnowboardIcon size={16} />}
            {sp} 레슨
          </button>
        ))}
      </div>

      {/* 장소 — 대분류: 지역 → 소분류: 그 지역 리조트 (숙소와 동일 패턴) */}
      <HScroll className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...RESORT_REGION_ORDER.filter((rg) => resorts.some((r) => resortRegion(r.location) === rg))].map((rg) => (
          <button
            key={rg}
            onClick={() => { setSelectedRegion(rg); setSelectedResort('all'); }}
            className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              selectedRegion === rg ? 'bg-accent text-white' : 'bg-snow text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {rg === 'all' ? '전체 지역' : rg}
          </button>
        ))}
      </HScroll>
      {selectedRegion !== 'all' && (
        <HScroll className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', name: '전체' }, ...resorts.filter((r) => resortRegion(r.location) === selectedRegion)].map((resort) => (
            <button
              key={resort.id}
              onClick={() => setSelectedResort(resort.id)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                selectedResort === resort.id
                  ? 'bg-sky-100 text-sky-700 border border-sky-300'
                  : 'bg-snow text-gray-500 border border-gray-200'
              }`}
            >
              {resort.name}
            </button>
          ))}
        </HScroll>
      )}

      {/* 강습 분야 필터 — 인터·레이싱 등 */}
      <HScroll className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', ...SPECIALTIES].map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSpec(sp)}
            className={`px-2.5 py-1.5 rounded-full font-medium text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${
              selectedSpec === sp ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
            }`}
          >
            {sp === 'all' ? '전체 분야' : sp}
          </button>
        ))}
      </HScroll>

      {/* Lesson Items — 포스터형 */}
      {loading ? (
        <PosterGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lessonItems.map((item) => {
            const cover = (item.images && item.images.split(',')[0]) || item.image || '';
            return (
              <Link
                to={`/lesson/${item.id}`}
                key={item.id}
                viewTransition
                onClick={(e) => { document.querySelectorAll('img[style*="hero-img"]').forEach((el) => { (el as HTMLElement).style.viewTransitionName = ''; }); const im = e.currentTarget.querySelector('img'); if (im) (im as HTMLElement).style.viewTransitionName = 'hero-img'; }}
                className="bg-snow border border-gray-200 rounded-xl overflow-hidden group block hover:border-gray-400 transition-colors"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-br from-sky-400 to-indigo-500 overflow-hidden">
                  {cover && (cover.startsWith('/') || cover.startsWith('http')) ? (
                    <img src={imageUrl(cover, 500)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2"><span className="text-white font-black text-sm text-center">{item.name}</span></div>
                  )}
                  {item.type && <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">{item.type}</span>}
                </div>
                <div className="p-3">
                  {item.resort?.name && <span className="text-[10px] font-medium text-sky-600">{item.resort.name}</span>}
                  <h3 className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-2">{item.name}</h3>
                  {item.specialties && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.specialties.split(',').map((sp) => (
                        <span key={sp} className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{sp}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && lessonItems.length === 0 && (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="3"/><path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/>
            </svg>
          </div>
          {(selectedSpec !== 'all' || selectedResort !== 'all' || selectedRegion !== 'all') ? (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">조건에 맞는 {sport} {vertical.pageLabels?.lesson || '레슨'}이 없어요</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">다른 분야·스키장을 선택하거나 필터를 해제해보세요.</p>
              <button onClick={() => { setSelectedSpec('all'); setSelectedResort('all'); setSelectedRegion('all'); }} className="inline-block px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs border border-gray-200">
                필터 해제
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 {sport} {vertical.pageLabels?.lesson || '레슨'}이 없어요</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                자격을 가진 분이라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 만나보세요. 등록은 무료입니다.
              </p>
              <Link to="/lesson/register" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
                + 첫 레슨 등록하기
              </Link>
            </>
          )}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Lesson;
