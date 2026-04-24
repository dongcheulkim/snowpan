import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { toastSuccess, toastError } from '../components/Toast';
import { HeartFilledIcon, PackageIcon } from '../components/Icons';

interface WishProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  status: string;
}

const MyWishlist = () => {
  const [products, setProducts] = useState<WishProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const statusText: Record<string, string> = {
    selling: t('used.status.selling'),
    reserved: t('used.status.reserved'),
    sold: t('used.status.sold'),
  };

  useEffect(() => {
    api<WishProduct[]>('/products/wishlist')
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      await api(`/products/${productId}/wishlist`, { method: 'POST' });
      setProducts(prev => prev.filter(p => p.id !== productId));
      toastSuccess('찜을 해제했습니다');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '찜 해제에 실패했습니다');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('myWishlist.title')}</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('myWishlist.loading')}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">{t('myWishlist.empty')}</div>
      ) : (
        <div className="space-y-2">
          {products.map((item) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <Link to={`/used/${item.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0">
                  {item.image.startsWith('http') || item.image.startsWith('/') ? (
                    <img src={imageUrl(item.image, 150)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : <PackageIcon size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</span>
                    {item.status !== 'selling' && (
                      <span className="text-[10px] text-gray-400">{statusText[item.status]}</span>
                    )}
                  </div>
                </div>
              </Link>
              <button onClick={() => handleRemove(item.id)} aria-label="찜 해제" className="text-coral flex-shrink-0 active:scale-125 transition-transform"><HeartFilledIcon size={20} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyWishlist;
