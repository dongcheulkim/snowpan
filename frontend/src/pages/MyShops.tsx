import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const handleDelete = async (type: string, shop: Shop) => {
    if (!confirm(`"${shop.name}" 매장을 삭제하시겠습니까?`)) return;
    try {
      await api(`/${type === 'ski' ? 'ski-shops' : 'repair-shops'}/${shop.id}`, { method: 'DELETE' });
      if (type === 'ski') setSkiShops(prev => prev.filter(s => s.id !== shop.id));
      else setRepairShops(prev => prev.filter(s => s.id !== shop.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const ShopCard = ({ shop, type }: { shop: Shop; type: string }) => (
    <div className="p-3 bg-snow rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
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
      <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
        <button onClick={() => navigate(`/${type === 'ski' ? 'skishop' : 'repair'}/${shop.id}/edit`)} className="flex-1 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors">수정</button>
        <button onClick={() => handleDelete(type, shop)} className="flex-1 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors">삭제</button>
      </div>
    </div>
  );

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

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
          <div className="text-center py-6">
            <p className="text-xs text-gray-500 mb-2">아직 등록한 스키샵이 없어요</p>
            <Link to="/skishop/register" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">+ 스키샵 등록하기</Link>
          </div>
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
          <div className="text-center py-6">
            <p className="text-xs text-gray-500 mb-2">아직 등록한 정비샵이 없어요</p>
            <Link to="/repair/register" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">+ 정비샵 등록하기</Link>
          </div>
        ) : (
          <div className="space-y-2">{repairShops.map(s => <ShopCard key={s.id} shop={s} type="repair" />)}</div>
        )}
      </div>
    </div>
  );
}
