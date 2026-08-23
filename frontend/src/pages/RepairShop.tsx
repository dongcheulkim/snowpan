import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { MaintenanceIcon } from '../components/CategoryIcons';
import { PhoneIcon } from '../components/Icons';
import RegisterCTA from '../components/RegisterCTA';
import CategoryAdBanner from '../components/CategoryAdBanner';
import { toastError } from '../components/Toast';
import { useVertical } from '../hooks/useVertical';

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
}

const areas = [
  { id: 'all', name: '전체' },
  { id: '서울', name: '서울' }, { id: '경기', name: '경기' }, { id: '강원', name: '강원' },
  { id: '충청', name: '충청' }, { id: '경상', name: '경상' }, { id: '전라', name: '전라' },
];

export default function RepairShop() {
  const vertical = useVertical();
  const [selectedArea, setSelectedArea] = useState('all');
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

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">{vertical.pageLabels?.repair || '정비샵'}</h1>
        </div>
        <RegisterCTA to="/repair/register" className="px-3 py-1.5 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors cursor-pointer">+ 등록</RegisterCTA>
      </div>

      {/* Ad Banner — 광고 있을 때만 노출 */}
      <CategoryAdBanner category="repair" />

      {/* 지역 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {areas.map(a => (
          <button key={a.id} onClick={() => setSelectedArea(a.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedArea === a.id ? 'bg-accent text-white' : 'bg-snow text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
            {a.name}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400"><MaintenanceIcon size={44} /></div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">
            {selectedArea !== 'all' ? `이 지역엔 아직 ${vertical.pageLabels?.repair || '정비샵'}이 없어요` : `아직 등록된 ${vertical.pageLabels?.repair || '정비샵'}이 없어요`}
          </h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            정비·전문가라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 만나보세요. 등록은 무료입니다.
          </p>
          <RegisterCTA to="/repair/register" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs cursor-pointer">
            + 첫 정비샵 등록하기
          </RegisterCTA>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {shops.map((shop) => {
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
