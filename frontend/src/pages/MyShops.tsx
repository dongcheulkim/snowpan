import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MaintenanceIcon, SkiShopIcon } from '../components/CategoryIcons';

interface Shop {
  id: string;
  name: string;
  area: string;
  approved: boolean;
  createdAt: string;
}

export default function MyShops() {
  const [skiShops, setSkiShops] = useState<Shop[]>([]);
  const [repairShops, setRepairShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Shop[]>('/ski-shops/my').catch(() => []),
      api<Shop[]>('/repair-shops/my').catch(() => []),
    ]).then(([ski, repair]) => {
      setSkiShops(Array.isArray(ski) ? ski : []);
      setRepairShops(Array.isArray(repair) ? repair : []);
    }).finally(() => setLoading(false));
  }, []);

  const ShopCard = ({ shop, type }: { shop: Shop; type: string }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-gray-700">{type === 'ski' ? <SkiShopIcon size={20} /> : <MaintenanceIcon size={20} />}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{shop.name}</p>
          <p className="text-[10px] text-gray-500">{shop.area}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shop.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {shop.approved ? '승인됨' : '대기중'}
      </span>
    </div>
  );

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm">로딩 중...</div>;

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 스키샵/정비샵</h1>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5"><SkiShopIcon size={16} /> 스키샵</h2>
          <Link to="/skishop/register" className="text-xs text-sky-600 font-bold">+ 등록</Link>
        </div>
        {skiShops.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">등록한 스키샵이 없습니다.</p>
        ) : (
          <div className="space-y-2">{skiShops.map(s => <ShopCard key={s.id} shop={s} type="ski" />)}</div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5"><MaintenanceIcon size={16} /> 정비샵</h2>
          <Link to="/repair/register" className="text-xs text-sky-600 font-bold">+ 등록</Link>
        </div>
        {repairShops.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">등록한 정비샵이 없습니다.</p>
        ) : (
          <div className="space-y-2">{repairShops.map(s => <ShopCard key={s.id} shop={s} type="repair" />)}</div>
        )}
      </div>
    </div>
  );
}
