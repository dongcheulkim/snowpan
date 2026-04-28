import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { PackageIcon } from '../components/Icons';

interface RecentProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  viewedAt: string;
}

const RecentlyViewed = () => {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyViewedProducts') || '[]') as RecentProduct[];
      setTimeout(() => setProducts(stored), 0);
    } catch { /* ignore */ }
  }, []);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const clearHistory = () => {
    localStorage.removeItem('recentlyViewedProducts');
    setProducts([]);
  };

  const isUrl = (s: string) => s.startsWith('http') || s.startsWith('/');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mypage" className="text-gray-500 text-lg">&larr;</Link>
          <h1 className="text-xl font-bold text-gray-900">{t('recentlyViewed.title')}</h1>
        </div>
        {products.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-coral transition-colors">
            {t('recentlyViewed.deleteAll')}
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">
          {t('recentlyViewed.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((item) => (
            <Link
              key={item.id}
              to={`/used/${item.id}`}
              className="card p-4 flex items-center gap-3 block card-hover"
            >
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 overflow-hidden flex-shrink-0">
                {isUrl(item.image) ? (
                  <img src={imageUrl(item.image, 180)} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <PackageIcon size={22} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-sm font-bold text-mint mt-0.5">{item.price.toLocaleString()}원</div>
              </div>
              <div className="text-[11px] text-gray-500 flex-shrink-0">
                {formatTime(item.viewedAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;
