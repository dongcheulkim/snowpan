import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  createdAt: string;
}

const MySales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = getUser();

  const loadProducts = () => {
    if (!user) return;
    api<Product[]>(`/products?userId=${user.id}&category=used`)
      .then(setProducts)
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">판매 물품</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">등록한 판매 물품이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {products.map((item) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <div className="cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                {item.image?.startsWith('http') ? (
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">판매중</div>
              </div>
              <div className="text-sm font-bold text-gray-900 mr-2">{item.price?.toLocaleString()}원</div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => navigate(`/used/${item.id}/edit`)}
                  className="px-3 py-1.5 bg-sky-50 text-sky-500 rounded-lg text-xs font-medium border border-sky-200 hover:bg-sky-100 transition-colors"
                >수정</button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1.5 bg-gray-50 text-red-400 rounded-lg text-xs font-medium border border-gray-200 hover:bg-red-50 transition-colors"
                >삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySales;
