import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { t, onLangChange } from '../i18n';
import { PackageIcon } from '../components/Icons';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  status: string;
  createdAt: string;
}

const PAGE = 30;

const MySales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  // reset=true 는 처음부터, false 는 다음 페이지 이어붙이기 (50개 넘는 판매내역도 다 관리 가능).
  const loadProducts = (reset = true) => {
    if (!user) { setLoading(false); return; } // 무한 스피너 방지
    const offset = reset ? 0 : products.length;
    if (reset) setLoading(true); else setLoadingMore(true);
    api<{ products: Product[]; totalCount: number }>(`/products?userId=${user.id}&category=used&limit=${PAGE}&offset=${offset}`)
      .then(data => {
        setProducts(prev => reset ? data.products : [...prev, ...data.products]);
        setTotal(data.totalCount);
      })
      .catch(() => { if (reset) setProducts([]); })
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      loadProducts();
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
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('mySales.title')}</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">{t('mySales.loading')}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">{t('mySales.empty')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((item) => {
            return (
              <div key={item.id} className={`card overflow-hidden ${item.status === 'sold' ? 'opacity-70' : ''}`}>
                {/* 이미지 (위) */}
                <div className="relative h-28 bg-gray-100 cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                  {(item.image?.startsWith('http') || item.image?.startsWith('/')) ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><PackageIcon size={28} /></div>
                  )}
                </div>
                {/* 정보 + 액션 (아래) */}
                <div className="p-2.5">
                  <h3 className="text-sm font-bold text-gray-900 truncate cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>{item.name}</h3>
                  <div className="text-sm font-bold text-mint mt-0.5 mb-2">{item.price?.toLocaleString()}원</div>
                  <select
                    value={item.status}
                    onChange={e => handleStatusChange(item.id, e.target.value)}
                    className={`w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border appearance-none cursor-pointer ${
                      item.status === 'selling' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                      item.status === 'reserved' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                      'text-gray-600 bg-gray-100 border-gray-300'
                    }`}
                  >
                    <option value="selling">판매중</option>
                    <option value="reserved">예약중</option>
                    <option value="sold">판매완료</option>
                  </select>
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => handleBump(item.id)}
                      className="flex-1 py-1.5 bg-mint/10 text-emerald-600 rounded-md text-[10px] font-medium border border-mint/30 hover:bg-mint/20 transition-colors"
                    >{t('mySales.bump')}</button>
                    <button
                      onClick={() => navigate(`/used/${item.id}/edit`)}
                      className="flex-1 py-1.5 bg-sky-50 text-sky-500 rounded-md text-[10px] font-medium border border-sky-200 hover:bg-sky-100 transition-colors"
                    >{t('mySales.edit')}</button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 py-1.5 bg-gray-50 text-red-400 rounded-md text-[10px] font-medium border border-gray-200 hover:bg-red-50 transition-colors"
                    >{t('mySales.delete')}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && products.length < total && (
        <button
          onClick={() => loadProducts(false)}
          disabled={loadingMore}
          className="w-full py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {loadingMore ? '불러오는 중...' : `더 보기 (${products.length}/${total})`}
        </button>
      )}
    </div>
  );
};

export default MySales;
