import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { t, onLangChange } from '../i18n';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  status: string;
  createdAt: string;
}

const MySales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const statusConfig: Record<string, { text: string; color: string; next: string; nextText: string }> = {
    selling: { text: t('used.status.selling'), color: 'text-emerald-600 bg-emerald-50 border-emerald-200', next: 'reserved', nextText: t('mySales.toReserved') },
    reserved: { text: t('used.status.reserved'), color: 'text-yellow-600 bg-yellow-50 border-yellow-200', next: 'sold', nextText: t('mySales.toSold') },
    sold: { text: t('used.status.sold'), color: 'text-gray-500 bg-gray-100 border-gray-300', next: 'selling', nextText: t('mySales.toSelling') },
  };

  const loadProducts = () => {
    if (!user) return;
    api<{ products: Product[]; totalCount: number }>(`/products?userId=${user.id}&category=used`)
      .then(data => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api(`/products/${id}`, { method: 'PUT', body: { status: newStatus } });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  const handleBump = async (id: string) => {
    try {
      await api(`/products/${id}/bump`, { method: 'PUT' });
      alert(t('mySales.bumpSuccess'));
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : '끌어올리기 실패');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('mySales.title')}</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('mySales.loading')}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">{t('mySales.empty')}</div>
      ) : (
        <div className="space-y-2">
          {products.map((item) => {
            void statusConfig;
            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                    {item.image?.startsWith('http') ? (
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-sm font-bold text-mint mt-0.5">{item.price?.toLocaleString()}원</div>
                  </div>
                  <select
                    value={item.status}
                    onChange={e => handleStatusChange(item.id, e.target.value)}
                    className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border appearance-none cursor-pointer ${
                      item.status === 'selling' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                      item.status === 'reserved' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                      'text-gray-500 bg-gray-100 border-gray-300'
                    }`}
                  >
                    <option value="selling">판매중</option>
                    <option value="reserved">예약중</option>
                    <option value="sold">판매완료</option>
                  </select>
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleBump(item.id)}
                    className="flex-1 py-2 bg-mint/10 text-emerald-600 rounded-lg text-[11px] font-medium border border-mint/30 hover:bg-mint/20 transition-colors"
                  >{t('mySales.bump')}</button>
                  <button
                    onClick={() => navigate(`/used/${item.id}/edit`)}
                    className="flex-1 py-2 bg-sky-50 text-sky-500 rounded-lg text-[11px] font-medium border border-sky-200 hover:bg-sky-100 transition-colors"
                  >{t('mySales.edit')}</button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 py-2 bg-gray-50 text-red-400 rounded-lg text-[11px] font-medium border border-gray-200 hover:bg-red-50 transition-colors"
                  >{t('mySales.delete')}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MySales;
