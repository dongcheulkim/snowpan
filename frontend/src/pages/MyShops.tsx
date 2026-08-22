import { toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  MaintenanceIcon, SkiShopIcon, RentalIcon, LessonIcon, AccommodationIcon,
} from '../components/CategoryIcons';

interface Shop {
  id: string;
  name: string;
  area?: string;
  price?: number;
  approved: boolean;
  viewCount?: number;
  createdAt: string;
}

// 사장님이 등록/관리하는 5개 업종. endpoint=목록조회, registerPath=등록,
// editBase=수정경로 prefix(/edit 붙음), deleteBase=삭제 API prefix.
const CATEGORIES = [
  { key: 'skishop', label: '스키샵', Icon: SkiShopIcon, endpoint: '/ski-shops/my', registerPath: '/skishop/register', editBase: '/skishop', deleteBase: '/ski-shops', hasViews: true },
  { key: 'repair', label: '정비샵', Icon: MaintenanceIcon, endpoint: '/repair-shops/my', registerPath: '/repair/register', editBase: '/repair', deleteBase: '/repair-shops', hasViews: true },
  { key: 'rental', label: '렌탈샵', Icon: RentalIcon, endpoint: '/rentals/my', registerPath: '/rental/register', editBase: '/rental', deleteBase: '/rentals', hasViews: false },
  { key: 'lesson', label: '레슨', Icon: LessonIcon, endpoint: '/lessons/my', registerPath: '/lesson/register', editBase: '/lesson', deleteBase: '/lessons', hasViews: false },
  { key: 'accommodation', label: '숙소', Icon: AccommodationIcon, endpoint: '/accommodations/my', registerPath: '/accommodation/register', editBase: '/accommodation', deleteBase: '/accommodations', hasViews: false },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];

export default function MyShops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Record<CatKey, Shop[]>>({
    skishop: [], repair: [], rental: [], lesson: [], accommodation: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      CATEGORIES.map((c) => api<Shop[]>(c.endpoint).catch(() => []))
    ).then((results) => {
      const next = {} as Record<CatKey, Shop[]>;
      CATEGORIES.forEach((c, i) => {
        next[c.key] = Array.isArray(results[i]) ? results[i] : [];
      });
      setShops(next);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (cat: typeof CATEGORIES[number], shop: Shop) => {
    if (!confirm(`"${shop.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api(`${cat.deleteBase}/${shop.id}`, { method: 'DELETE' });
      setShops((prev) => ({ ...prev, [cat.key]: prev[cat.key].filter((s) => s.id !== shop.id) }));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const ShopCard = ({ shop, cat }: { shop: Shop; cat: typeof CATEGORIES[number] }) => {
    const sub = [
      shop.area,
      cat.hasViews ? `조회 ${(shop.viewCount ?? 0).toLocaleString()}` : (shop.price ? `${shop.price.toLocaleString()}원` : null),
    ].filter(Boolean).join(' · ');
    return (
      <div className="p-3 bg-snow rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-gray-700"><cat.Icon size={20} /></span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{shop.name}</p>
              {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shop.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {shop.approved ? '승인됨' : '대기중'}
          </span>
        </div>
        <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
          <button onClick={() => navigate(`${cat.editBase}/${shop.id}/edit`)} className="flex-1 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors">수정</button>
          <button onClick={() => handleDelete(cat, shop)} className="flex-1 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors">삭제</button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

  const all = CATEGORIES.flatMap((c) => shops[c.key]);
  const totalShops = all.length;
  const totalViews = all.reduce((n, s) => n + (s.viewCount ?? 0), 0);

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">사장님 대시보드</h1>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        스키샵·정비샵·렌탈샵·레슨·숙소를 등록하고 한 곳에서 관리하세요.
      </p>

      {totalShops > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalShops}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">등록 업소</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-sky-600">{totalViews.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">총 조회수</div>
          </div>
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const list = shops[cat.key];
        return (
          <div key={cat.key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
                <cat.Icon size={16} /> {cat.label}
              </h2>
              <Link to={cat.registerPath} className="text-xs text-sky-600 font-bold">+ 등록</Link>
            </div>
            {list.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500 mb-2">아직 등록한 {cat.label}이(가) 없어요</p>
                <Link to={cat.registerPath} className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">+ {cat.label} 등록하기</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((s) => <ShopCard key={s.id} shop={s} cat={cat} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
