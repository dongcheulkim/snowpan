import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUrlFilters, useListHere } from '../hooks/useUrlFilters';
const FILTER_DEFAULTS = { sport: '스키', region: 'all', resort: 'all', spec: 'all' };
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import CategoryAdBanner from '../components/CategoryAdBanner';
import LoadError from '../components/LoadError';
import { SkiIcon, SnowboardIcon } from '../components/Icons';
import { useVertical } from '../hooks/useVertical';
import { RowListSkeleton } from '../components/Skeleton';
import HScroll from '../components/HScroll';
import { RESORT_REGION_ORDER, resortRegion } from '../utils/resortRegion';

interface LessonItem {
  isPremium?: boolean;
  businessVerified?: boolean; // 관리자가 사업자등록증 확인 후 부여 (2026-09-23)
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
  // 필터는 URL 쿼리(?sport=&region=&resort=&spec=)에 보관 — 상세에서 돌아와도 유지 (사용자 신고 2026-09-09)
  const [filters, setFilters] = useUrlFilters(FILTER_DEFAULTS);
  const selectedResort = filters.resort;
  const selectedSpec = filters.spec;
  const sport: '스키' | '보드' = filters.sport === '보드' ? '보드' : '스키';
  const setSelectedResort = (v: string) => setFilters({ resort: v });
  const setSelectedSpec = (v: string) => setFilters({ spec: v });
  const setSport = (v: '스키' | '보드') => setFilters({ sport: v });
  const listHere = useListHere();
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 메시지 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0); // '다시 시도' — 목록 이펙트 재실행
  const [resorts, setResorts] = useState<Resort[]>([]);
  // 지역(대분류) → 리조트(소분류) 2단계 — 리조트 칩이 길어 한 줄로 못 담던 것
  const selectedRegion = filters.region;

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
      setLoadError(null);
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
        // 토스트 대신 목록 자리에 재시도 안내 (LoadError) — 빈 상태로 오해하지 않게
        setLoadError(err instanceof Error ? err.message : '레슨 목록을 불러오지 못했어요.');
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    };
    fetchLessons();

  }, [selectedResort, selectedRegion, resorts, selectedSpec, sport, page, retryKey]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.lesson || '레슨'}</h1>
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
            onClick={() => setFilters({ region: rg, resort: 'all' })}
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

      {/* Lesson Items — 촘촘한 리스트 (매장 목록과 같은 형태로, 한 화면에 더 많이) 2026-09-22 */}
      {loading ? (
        <RowListSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {lessonItems.map((item) => {
            const cover = (item.images && item.images.split(',')[0]) || item.image || '';
            const hasCover = !!cover && (cover.startsWith('/') || cover.startsWith('http'));
            const specs = (item.specialties || '').split(',').map((sp) => sp.trim()).filter(Boolean).slice(0, 3);
            const sub = [item.resort?.name, ...specs].filter(Boolean).join(' · ');
            return (
              <Link
                to={`/lesson/${item.id}`}
                state={{ from: listHere }}
                key={item.id}
                viewTransition
                onClick={(e) => { document.querySelectorAll('img[style*="hero-img"]').forEach((el) => { (el as HTMLElement).style.viewTransitionName = ''; }); const im = e.currentTarget.querySelector('img'); if (im) (im as HTMLElement).style.viewTransitionName = 'hero-img'; }}
                className={`card p-2.5 relative block card-hover ${item.isPremium ? 'border-sky-300 bg-sky-50/30' : ''}`}
              >
                {item.isPremium && <span className="absolute top-2 right-2 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>}
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    {hasCover
                      ? <img src={imageUrl(cover, 200)} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      : (/보드/.test(item.type || '') ? <SnowboardIcon size={22} className="text-white" /> : <SkiIcon size={22} className="text-white" />)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
                      {item.type && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200 flex-shrink-0">{item.type}</span>}
                      {item.businessVerified && <span className="text-[10px] font-bold bg-white text-gray-900 px-1.5 py-0.5 rounded border border-gray-900 flex-shrink-0">사업자 확인</span>}
                    </div>
                    {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && lessonItems.length === 0 && (loadError ? (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="3"/><path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/>
            </svg>
          </div>
          {(selectedSpec !== 'all' || selectedResort !== 'all' || selectedRegion !== 'all') ? (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">조건에 맞는 {sport} {vertical.pageLabels?.lesson || '레슨'}이 없어요</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">다른 분야·스키장을 선택하거나 필터를 해제해보세요.</p>
              <button onClick={() => setFilters({ spec: 'all', resort: 'all', region: 'all' })} className="inline-block px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs border border-gray-200">
                필터 해제
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 {sport} {vertical.pageLabels?.lesson || '레슨'}이 없어요</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                자격을 가진 분이라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 만나보세요. 등록은 무료입니다.
              </p>
              <Link to="/mypage/shops" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
                사장님 대시보드에서 등록하기
              </Link>
            </>
          )}
        </div>
      ))}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Lesson;
