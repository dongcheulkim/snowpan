import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUrlFilters, useListHere } from '../hooks/useUrlFilters';
const FILTER_DEFAULTS = { region: 'all', resort: 'all', type: 'all' };
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import CategoryAdBanner from '../components/CategoryAdBanner';
import LoadError from '../components/LoadError';
import { useVertical } from '../hooks/useVertical';
import { RowListSkeleton } from '../components/Skeleton';
import UnverifiedShopBadge from '../components/UnverifiedShopBadge';
import { resortRegion, RESORT_REGION_ORDER } from '../utils/resortRegion';
import HScroll from '../components/HScroll';

interface AccommodationItem {
  isPremium?: boolean;
  claimable?: boolean;
  id: string;
  name: string;
  type: string;
  price: number;
  originalPrice: number;
  guests: string;
  features: string;
  image: string;
  resort?: { id: string; name: string };
}

const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방', guest: '게스트' };

interface Resort {
  id: string;
  name: string;
  location?: string | null;
}

const PAGE_SIZE = 12;

const Accommodation = () => {
  const vertical = useVertical();
  // 필터는 URL 쿼리(?region=&resort=&type=)에 보관 — 상세에서 돌아와도 유지 (사용자 신고 2026-09-09)
  const [filters, setFilters] = useUrlFilters(FILTER_DEFAULTS);
  const selectedResort = filters.resort;
  const selectedType = filters.type;
  const selectedRegion = filters.region; // 대분류: 지역
  const setSelectedType = (v: string) => setFilters({ type: v });
  const setSelectedResort = (v: string) => setFilters({ resort: v });
  const listHere = useListHere();
  const [accommodations, setAccommodations] = useState<AccommodationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 메시지 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0); // '다시 시도' — 목록 이펙트 재실행
  const [resorts, setResorts] = useState<Resort[]>([]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  const types = [
    { id: 'all', name: '전체' },
    { id: 'hotel', name: '호텔' },
    { id: 'pension', name: '펜션' },
    { id: 'condo', name: '콘도' },
    { id: 'minbak', name: '민박' },
    { id: 'season', name: '시즌방' },
    { id: 'guest', name: '게스트' },
  ];

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedRegion, selectedResort, selectedType]);
  // (지역을 바꾸면 리조트를 '전체'로 — 지역 칩 클릭 핸들러에서 함께 처리. 마운트 시 URL 의 리조트가 지워지지 않도록 이펙트로는 하지 않음)

  const reqSeqRef = useRef(0); // 필터 변경 직후 페이지리셋 이펙트와 겹치는 요청 레이스 방지
  useEffect(() => {
    const seq = ++reqSeqRef.current;
    const fetchAccommodations = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedResort !== 'all') {
          params.set('resortId', selectedResort);
        } else if (selectedRegion !== 'all') {
          const ids = resorts.filter((r) => resortRegion(r.location) === selectedRegion).map((r) => r.id);
          if (ids.length) params.set('resortId', ids.join(','));
        }
        if (selectedType !== 'all') params.set('type', selectedType);
        const data = await api<{ items: AccommodationItem[]; totalCount: number }>(`/accommodations?${params}`);
        if (seq !== reqSeqRef.current) return; // 늦게 도착한 이전 요청 무시
        setAccommodations(data.items);
        setTotalCount(data.totalCount);
      } catch (err) {
        if (seq !== reqSeqRef.current) return;
        setAccommodations([]);
        setTotalCount(0);
        // 토스트 대신 목록 자리에 재시도 안내 (LoadError) — 빈 상태로 오해하지 않게
        setLoadError(err instanceof Error ? err.message : '숙소 목록을 불러오지 못했어요.');
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    };
    fetchAccommodations();
  }, [selectedRegion, selectedResort, resorts, selectedType, page, retryKey]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.accommodation || '숙소'}</h1>
      </div>

      <CategoryAdBanner category="accommodation" />

      {/* 대분류: 지역 → 소분류: 그 지역 리조트 */}
      <HScroll className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...RESORT_REGION_ORDER.filter((rg) => resorts.some((r) => resortRegion(r.location) === rg))].map((rg) => (
          <button
            key={rg}
            onClick={() => setFilters({ region: rg, resort: 'all' })}
            className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              selectedRegion === rg ? 'bg-accent text-white' : 'bg-snow text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {rg === 'all' ? '전체' : rg}
          </button>
        ))}
      </HScroll>
      <HScroll className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: '전체' }, ...resorts.filter((r) => selectedRegion === 'all' || resortRegion(r.location) === selectedRegion)].map((resort) => (
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

      {/* Type Filter */}
      <div className="flex gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
              selectedType === type.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Accommodation List — 촘촘한 리스트 (매장 목록과 같은 형태로, 한 화면에 더 많이) 2026-09-22 */}
      {loading ? (
        <RowListSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {accommodations.map((item) => {
            const hasCover = item.image.startsWith('/') || item.image.startsWith('http');
            const typeLabel = item.type.split(',').map(t => typeMap[t] || t).filter(Boolean).join(', ');
            const features = item.features.split(',').map((f) => f.trim()).filter(Boolean).slice(0, 3);
            const discount = item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
            const sub = [item.resort?.name, item.guests, ...features].filter(Boolean).join(' · ');
            return (
              <Link to={`/accommodation/${item.id}`} state={{ from: listHere }} key={item.id} className={`card p-2.5 relative block card-hover ${item.isPremium ? 'border-sky-300 bg-sky-50/30' : ''}`}>
                {item.isPremium && <span className="absolute top-2 right-2 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>}
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <img
                      src={hasCover ? imageUrl(item.image, 200) : '/icons/placeholder-card.svg'}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={e => { const i = e.target as HTMLImageElement; if (!i.dataset.fallback) { i.dataset.fallback = '1'; i.src = '/icons/placeholder-card.svg'; } }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
                      <UnverifiedShopBadge claimable={item.claimable} compact />
                      {typeLabel && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200 flex-shrink-0">{typeLabel}</span>}
                    </div>
                    {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</div>
                    <div className="text-[10px] text-gray-500">1박{discount > 0 ? ` · ${discount}% 할인` : ''}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && accommodations.length === 0 && (loadError ? (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M10 9h.01M14 9h.01M10 13h.01M14 13h.01"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 {vertical.pageLabels?.accommodation || '숙소'}가 없어요</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            숙소 운영자라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 직접 만나보세요. 등록은 무료입니다.
          </p>
          <Link to="/mypage/shops" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
            사장님 대시보드에서 등록하기
          </Link>
        </div>
      ))}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Accommodation;
