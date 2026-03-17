import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: string;
}

const Used = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ski', name: '스키' },
    { id: 'board', name: '보드' },
    { id: 'boots', name: '부츠' },
    { id: 'binding', name: '바인딩' },
    { id: 'helmet', name: '헬멧' },
    { id: 'goggles', name: '고글' },
    { id: 'wear', name: '의류' },
    { id: 'etc', name: '기타' },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api<Product[]>('/products?category=used');
        setProducts(data);
      } catch {
        // fallback to empty
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.brand === selectedCategory);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">중고 장비</h1>
        <Link
          to="/used/register"
          className="px-4 py-1.5 bg-mint text-black rounded-lg font-bold text-xs hover:bg-emerald-300 transition-colors whitespace-nowrap"
        >
          + 장비 등록
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <Link to={`/used/${product.id}`} key={product.id} className="card overflow-hidden card-hover block">
              <div className="h-28 flex items-center justify-center text-4xl bg-gray-100">
                {product.image}
              </div>
              <div className="p-3">
                <div className="text-[10px] text-accent-light font-medium uppercase tracking-wider">{product.brand}</div>
                <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{product.name}</h3>
                <span className="text-base font-bold text-mint">{product.price.toLocaleString()}원</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-400 card text-sm">
          해당 조건의 중고 장비가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Used;
