import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import CategoryAdBanner from '../components/CategoryAdBanner';
import UnverifiedShopBadge from '../components/UnverifiedShopBadge';
import { toastError } from '../components/Toast';
import { useVertical } from '../hooks/useVertical';
import { PhoneIcon } from '../components/Icons';
import { RentalIcon } from '../components/CategoryIcons';
import { RowListSkeleton } from '../components/Skeleton';
import HScroll from '../components/HScroll';
import { RESORT_REGION_ORDER, resortRegion } from '../utils/resortRegion';

interface RentalItem {
  isPremium?: boolean;
  claimable?: boolean;
  id: string;
  name: string;
  area?: string | null;
  phone?: string | null;
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

const Rental = () => {
  const vertical = useVertical();
  const [selectedResort, setSelectedResort] = useState<string>('all');
  // 지역(대분류)→리조트(소분류) 2단계 — 리조트 칩이 길어 한 줄로 못 담던 것 (레슨과 통일)
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resorts, setResorts] = useState<Resort[]>([]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedResort, selectedRegion]);

  const reqSeqRef = useRef(0); // 필터 변경 직후 페이지리셋 이펙트와 겹치는 요청 레이스 방지
  useEffect(() => {
    const seq = ++reqSeqRef.current;
    const fetchRentals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedResort !== 'all') {
          params.set('resortId', selectedResort);
        } else if (selectedRegion !== 'all') {
          const ids = resorts.filter((r) => resortRegion(r.location) === selectedRegion).map((r) => r.id);
          if (ids.length) params.set('resortId', ids.join(','));
        }
        const data = await api<{ items: RentalItem[]; totalCount: number }>(`/rentals?${params}`);
        if (seq !== reqSeqRef.current) return; // 늦게 도착한 이전 요청 무시
        setRentalItems(data.items);
        setTotalCount(data.totalCount);
      } catch (err) {
        if (seq !== reqSeqRef.current) return;
        setRentalItems([]);
        setTotalCount(0);
        toastError(err instanceof Error ? err.message : '렌탈샵 목록을 불러오지 못했습니다');
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    };
    fetchRentals();
  }, [selectedResort, selectedRegion, resorts, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.rental || '렌탈'}</h1>
      </div>

      <CategoryAdBanner category="rental" />

      {/* 장소 — 대분류: 지역 → 소분류: 그 지역 리조트 (레슨·숙소와 동일 패턴) */}
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

      {/* Rental Items */}
      {loading ? (
        <RowListSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rentalItems.map((item) => {
            const cover = (item.images || item.image || '').split(',')[0]?.trim();
            return (
            <Link to={`/rental/${item.id}`} key={item.id} className="card p-4 block card-hover">
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {cover
                    ? <img src={imageUrl(cover, 200)} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    : <RentalIcon size={30} className="text-gray-300" />}
                  {item.isPremium && <span className="absolute top-1 left-1 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 truncate">{item.name}</h3>
                    <UnverifiedShopBadge claimable={item.claimable} compact />
                    {(item.area || item.resort?.name) && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200 flex-shrink-0">{item.area || item.resort?.name}</span>}
                  </div>
                  {item.phone && (
                    <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1 hover:text-gray-900">
                      <PhoneIcon size={12} /> {item.phone}
                    </a>
                  )}
                </div>
                <span className="text-gray-300 text-lg flex-shrink-0">›</span>
              </div>
            </Link>
            );
          })}
        </div>
      )}

      {!loading && rentalItems.length === 0 && (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7l3-4h12l3 4M3 7v13h18V7M3 7h18M9 11h6"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 {vertical.pageLabels?.rental || '렌탈샵'}이 없어요</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            첫 번째로 등록해서 {vertical.audience || '사용자'}들에게 노출 기회를<br/>가져가세요. 등록은 무료입니다.
          </p>
          <Link to="/mypage/shops" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
            사장님 대시보드에서 등록하기
          </Link>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Rental;
