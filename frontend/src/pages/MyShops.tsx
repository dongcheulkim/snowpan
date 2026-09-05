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

interface ShopPostItem {
  id: string;
  title: string;
  postType: string;
  pinned: boolean;
  viewCount: number;
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

const POST_TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '일반', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

export default function MyShops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Record<CatKey, Shop[]>>({
    skishop: [], repair: [], rental: [], lesson: [], accommodation: [],
  });
  const [loading, setLoading] = useState(true);
  // 소식 패널 — 매장별 토글. key = `${cat.key}:${shop.id}`
  const [openNews, setOpenNews] = useState<string | null>(null);
  const [posts, setPosts] = useState<Record<string, ShopPostItem[]>>({});
  const [postsLoading, setPostsLoading] = useState<string | null>(null);

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

  const toggleNews = async (cat: typeof CATEGORIES[number], shop: Shop) => {
    const key = `${cat.key}:${shop.id}`;
    if (openNews === key) { setOpenNews(null); return; }
    setOpenNews(key);
    if (posts[key]) return; // 이미 불러옴
    setPostsLoading(key);
    try {
      const res = await api<{ items: ShopPostItem[] }>(`/shop-posts?shopType=${cat.key}&shopId=${shop.id}&limit=20`);
      setPosts((prev) => ({ ...prev, [key]: Array.isArray(res?.items) ? res.items : [] }));
    } catch {
      setPosts((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setPostsLoading(null);
    }
  };

  const handleDeletePost = async (key: string, post: ShopPostItem) => {
    if (!confirm(`소식 "${post.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api(`/shop-posts/${post.id}`, { method: 'DELETE' });
      setPosts((prev) => ({ ...prev, [key]: (prev[key] || []).filter((p) => p.id !== post.id) }));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const NewsPanel = ({ shop, cat }: { shop: Shop; cat: typeof CATEGORIES[number] }) => {
    const key = `${cat.key}:${shop.id}`;
    const list = posts[key] || [];
    return (
      <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
        {shop.approved ? (
          <Link
            to={`/shop/${cat.key}/${shop.id}/post/new`}
            className="block w-full py-2 text-center text-xs font-bold text-white bg-sky-500 rounded-md hover:bg-sky-600 transition-colors"
          >
            + 소식·이벤트 쓰기
          </Link>
        ) : (
          <p className="text-[11px] text-gray-500 text-center py-1">매장 승인 후에 새 소식을 올릴 수 있어요.</p>
        )}
        {postsLoading === key ? (
          <p className="text-[11px] text-gray-400 text-center py-2">불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-2">아직 올린 소식이 없어요.</p>
        ) : (
          list.map((p) => {
            const t = POST_TYPE_LABEL[p.postType] || POST_TYPE_LABEL.general;
            return (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-100">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${t.color}`}>{t.text}</span>
                <Link to={`/shop-post/${p.id}`} className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate">{p.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString('ko-KR')} · 조회 {(p.viewCount ?? 0).toLocaleString()}
                  </p>
                </Link>
                <button onClick={() => navigate(`/shop-post/${p.id}/edit`)} className="shrink-0 text-[11px] font-bold text-sky-600 px-1.5 py-1">수정</button>
                <button onClick={() => handleDeletePost(key, p)} className="shrink-0 text-[11px] font-bold text-red-500 px-1.5 py-1">삭제</button>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const ShopCard = ({ shop, cat }: { shop: Shop; cat: typeof CATEGORIES[number] }) => {
    const key = `${cat.key}:${shop.id}`;
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
          <button onClick={() => toggleNews(cat, shop)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${openNews === key ? 'text-white bg-violet-500' : 'text-violet-600 bg-violet-50 hover:bg-violet-100'}`}>소식·이벤트</button>
          <button onClick={() => handleDelete(cat, shop)} className="flex-1 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-md hover:bg-red-100 transition-colors">삭제</button>
        </div>
        {openNews === key && <NewsPanel shop={shop} cat={cat} />}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

  const all = CATEGORIES.flatMap((c) => shops[c.key]);
  const totalShops = all.length;
  const totalViews = all.reduce((n, s) => n + (s.viewCount ?? 0), 0);
  // 내가 등록한 업종만 노출 (등록 안 한 카테고리는 숨김).
  const visibleCategories = CATEGORIES.filter((c) => shops[c.key].length > 0);

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">사장님 대시보드</h1>
        </div>
        <Link to="/mypage/ads" className="text-xs text-sky-600 font-bold">광고 관리</Link>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        매장 정보 수정, 소식·이벤트 등록, 신규 등록까지 여기서 한번에 관리하세요.
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

      {visibleCategories.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">아직 등록한 매장이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">아래에서 업종을 선택해 첫 매장을 등록해보세요.</p>
        </div>
      )}

      {visibleCategories.map((cat) => (
        <div key={cat.key} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
              <cat.Icon size={16} /> {cat.label}
            </h2>
            <Link to={cat.registerPath} className="text-xs text-sky-600 font-bold">+ 추가 등록</Link>
          </div>
          <div className="space-y-2">
            {shops[cat.key].map((s) => <ShopCard key={s.id} shop={s} cat={cat} />)}
          </div>
        </div>
      ))}

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">새 매장 등록</h2>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to={cat.registerPath}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-sky-300 hover:text-sky-600 transition-colors"
            >
              <cat.Icon size={20} />
              <span className="text-[10px] font-medium">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
