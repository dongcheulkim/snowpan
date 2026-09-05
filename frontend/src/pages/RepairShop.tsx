import { useState, useEffect } from 'react';
import { REPAIR_SERVICES, TUNING_ALIASES } from '../utils/repairServices';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { MaintenanceIcon } from '../components/CategoryIcons';
import { PhoneIcon } from '../components/Icons';
import CategoryAdBanner from '../components/CategoryAdBanner';
import UnverifiedShopBadge from '../components/UnverifiedShopBadge';
import { toastError } from '../components/Toast';
import { useVertical } from '../hooks/useVertical';
import { RowListSkeleton } from '../components/Skeleton';
import HScroll from '../components/HScroll';

interface Shop {
  id: string;
  name: string;
  area: string;
  address: string;
  description: string;
  services?: string | null;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  naverMap?: string | null;
  hours?: string | null;
  image?: string | null;
  images?: string | null;
  isPremium?: boolean;
  claimable?: boolean;
}

const areas = [
  { id: 'all', name: '전체' },
  { id: '서울', name: '서울' }, { id: '경기', name: '경기' }, { id: '강원', name: '강원' },
  { id: '충청', name: '충청' }, { id: '경상', name: '경상' }, { id: '전라', name: '전라' },
];

export default function RepairShop() {
  const vertical = useVertical();
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedArea !== 'all') params.set('area', selectedArea);
    api<Shop[]>(`/repair-shops?${params}`)
      .then(data => setShops(Array.isArray(data) ? data : []))
      .catch((err) => { setShops([]); toastError(err instanceof Error ? err.message : '정비샵 목록을 불러오지 못했습니다'); })
      .finally(() => setLoading(false));
  }, [selectedArea]);

  // 서비스 필터는 클라이언트에서 — 목록이 통짜 배열이라 재요청 불필요 (services 는 콤마 텍스트)
  const shownShops = selectedService === 'all' ? shops : shops.filter(sh => {
    const sv = sh.services || '';
    // '튜닝' 은 예전 자유입력(왁싱·엣지·바인딩·정비 등)까지 포괄 매칭
    return selectedService === '튜닝' ? TUNING_ALIASES.some(a => sv.includes(a)) : sv.includes(selectedService);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">{vertical.pageLabels?.repair || '정비샵'}</h1>
        </div>
      </div>

      {/* Ad Banner — 광고 있을 때만 노출 */}
      <CategoryAdBanner category="repair" />

      {/* 지역 필터 */}
      <HScroll className="flex gap-2 overflow-x-auto pb-1">
        {areas.map(a => (
          <button key={a.id} onClick={() => setSelectedArea(a.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedArea === a.id ? 'bg-accent text-white' : 'bg-snow text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
            {a.name}
          </button>
        ))}
      </HScroll>

      {/* 서비스 종류 필터 — 부츠피팅 등 원하는 정비만 골라 보기 */}
      <HScroll className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', ...REPAIR_SERVICES].map((sv) => (
          <button key={sv} onClick={() => setSelectedService(sv)}
            className={`px-2.5 py-1.5 rounded-full font-medium text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${selectedService === sv ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
            {sv === 'all' ? '전체 서비스' : sv}
          </button>
        ))}
      </HScroll>

      {/* 목록 */}
      {loading ? (
        <RowListSkeleton count={5} />
      ) : shownShops.length === 0 ? (
        <div className="text-center py-16 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400"><MaintenanceIcon size={44} /></div>
          {selectedService !== 'all' ? (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">조건에 맞는 {vertical.pageLabels?.repair || '정비샵'}이 없어요</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                다른 서비스 종류를 선택하거나 필터를 해제해보세요.
              </p>
              <button onClick={() => setSelectedService('all')} className="inline-block px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs border border-gray-200">
                서비스 필터 해제
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-gray-900 mb-1.5">
                {selectedArea !== 'all' ? `이 지역엔 아직 ${vertical.pageLabels?.repair || '정비샵'}이 없어요` : `아직 등록된 ${vertical.pageLabels?.repair || '정비샵'}이 없어요`}
              </h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                정비·전문가라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 만나보세요. 등록은 무료입니다.
              </p>
              <Link to="/mypage/shops" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
                사장님 대시보드에서 등록하기
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {shownShops.map((shop) => {
            const cover = (shop.images || shop.image || '').split(',')[0]?.trim();
            return (
            <Link to={`/repair/${shop.id}`} key={shop.id} className={`card p-4 relative block card-hover ${shop.isPremium ? 'border-sky-300 bg-sky-50/30' : ''}`}>
              {shop.isPremium && <span className="absolute top-2 right-2 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>}
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {cover
                    ? <img src={imageUrl(cover, 200)} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    : <MaintenanceIcon size={30} className="text-gray-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 truncate">{shop.name}</h3>
                    <UnverifiedShopBadge claimable={shop.claimable} compact />
                    {shop.area && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200 flex-shrink-0">{shop.area}</span>}
                  </div>
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`} onClick={e => e.stopPropagation()} className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1 hover:text-gray-900">
                      <PhoneIcon size={12} /> {shop.phone}
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
    </div>
  );
}
