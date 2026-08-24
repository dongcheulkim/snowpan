import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { RowListSkeleton } from '../components/Skeleton';

// 매장 소식 전체 피드 — 홈은 매장당 최신 1개만 보여주므로,
// 밀려난 소식까지 전부 시간순으로 볼 수 있는 페이지.

interface ShopNews {
  id: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
  createdAt: string;
  shopType: string;
  shopName: string;
}

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '소식', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'promo', label: '프로모션' },
  { id: 'event', label: '이벤트' },
  { id: 'notice', label: '공지' },
];

// 매장 종류별 필터 — 스키샵/렌탈 소식이 섞여 보이지 않게.
const SHOP_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'skishop', label: '스키샵' },
  { id: 'repair', label: '정비샵' },
  { id: 'rental', label: '렌탈샵' },
  { id: 'lesson', label: '레슨' },
  { id: 'accommodation', label: '숙소' },
];
const SHOP_TYPE_LABEL: Record<string, string> = {
  skishop: '스키샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소',
};

export default function ShopNewsPage() {
  const [items, setItems] = useState<ShopNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');

  useEffect(() => {
    document.title = '매장 소식·이벤트 - 스노우판';
    api<{ items: ShopNews[] }>('/shop-posts/recent?all=1&limit=50')
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = items
    .filter((n) => shopFilter === 'all' || n.shopType === shopFilter)
    .filter((n) => filter === 'all' || n.postType === filter);

  const formatDate = (s: string) => {
    const d = new Date(s);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">매장 소식·이벤트</h1>
      </div>

      {/* 매장 종류 필터 — 카테고리별 소식만 모아보기 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SHOP_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setShopFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${
              shopFilter === f.id ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {/* 소식 유형 필터 */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filter === f.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {loading ? (
        <RowListSkeleton count={5} />
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <p className="text-sm text-gray-500">아직 등록된 소식이 없어요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((n) => {
            const label = TYPE_LABEL[n.postType] || TYPE_LABEL.general;
            const thumb = (n.images || '').split(',').filter(Boolean)[0];
            return (
              <Link key={n.id} to={`/shop-post/${n.id}`} className="flex gap-3 p-4 bg-snow border border-gray-200 rounded-2xl active:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${label.color}`}>{label.text}</span>
                    {SHOP_TYPE_LABEL[n.shopType] && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200 flex-shrink-0">{SHOP_TYPE_LABEL[n.shopType]}</span>
                    )}
                    <span className="text-[11px] font-bold text-gray-500 truncate">{n.shopName}</span>
                    <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1.5 line-clamp-1">{n.title}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{n.content}</p>
                </div>
                {thumb && (
                  <img src={imageUrl(thumb, 200)} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
