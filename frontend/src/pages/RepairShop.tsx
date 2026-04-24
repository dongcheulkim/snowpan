import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MaintenanceIcon } from '../components/CategoryIcons';
import { ClockIcon, LocationIcon, PhoneIcon } from '../components/Icons';

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
  isPremium?: boolean;
}

const areas = [
  { id: 'all', name: '전체' },
  { id: '서울', name: '서울' }, { id: '경기', name: '경기' }, { id: '강원', name: '강원' },
  { id: '충청', name: '충청' }, { id: '경상', name: '경상' }, { id: '전라', name: '전라' },
];

export default function RepairShop() {
  const [selectedArea, setSelectedArea] = useState('all');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedArea !== 'all') params.set('area', selectedArea);
    api<Shop[]>(`/repair-shops?${params}`)
      .then(data => setShops(Array.isArray(data) ? data : []))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, [selectedArea]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">정비샵</h1>
        </div>
        <Link to="/repair/register" className="px-3 py-1.5 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors">+ 등록</Link>
      </div>

      {/* 지역 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {areas.map(a => (
          <button key={a.id} onClick={() => setSelectedArea(a.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedArea === a.id ? 'bg-accent text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
            {a.name}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-300"><MaintenanceIcon size={44} /></div>
          <p className="text-sm text-gray-400">{selectedArea !== 'all' ? '해당 지역에 등록된 정비샵이 없습니다.' : '아직 등록된 정비샵이 없습니다.'}</p>
          <p className="text-xs text-gray-300 mt-1">직접 정비샵을 등록해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shops.map((shop) => (
            <Link to={`/repair/${shop.id}`} key={shop.id} className={`card p-5 relative block card-hover ${shop.isPremium ? 'border-sky-300 bg-sky-50/30' : ''}`}>
              {shop.isPremium && <span className="absolute top-2 right-2 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>}
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0 overflow-hidden">
                  {shop.image ? <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" /> : <MaintenanceIcon size={32} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">{shop.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 inline-flex items-center gap-1"><LocationIcon size={12} /> {shop.address}</p>
                  {shop.hours && <p className="text-xs text-gray-400 inline-flex items-center gap-1"><ClockIcon size={12} /> {shop.hours}</p>}
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">{shop.description}</p>
                  {shop.services && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shop.services.split(',').filter(Boolean).map((s, i) => (
                        <span key={i} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">{s.trim()}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" onClick={e => e.stopPropagation()}>
                    {shop.phone && <a href={`tel:${shop.phone}`} onClick={e => e.stopPropagation()} className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"><PhoneIcon size={12} /> {shop.phone}</a>}
                    {shop.instagram && <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-pink-500 hover:underline">@{shop.instagram}</a>}
                    {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-sky-600 hover:underline">홈페이지</a>}
                    {shop.naverMap && <a href={shop.naverMap} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-600 hover:underline">네이버지도</a>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
