import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const user = getUser();

  useEffect(() => {
    if (!user) return;
    api<Product[]>(`/products?userId=${user.id}&category=used`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">판매 내역</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">판매 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {products.map((item) => (
            <Link to={`/used/${item.id}`} key={item.id} className="card p-4 flex items-center gap-3 block">
              {item.image?.startsWith('http') ? (
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">📦</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">판매중</div>
              </div>
              <div className="text-sm font-bold text-gray-900">{item.price?.toLocaleString()}원</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySales;
