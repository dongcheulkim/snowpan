import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import Pagination from '../components/Pagination';

interface Product {
  id: string;
  name: string;
  brand: string;
  subcategory: string | null;
  price: number;
  image: string;
  category: string;
  status: string;
  isPremium?: boolean;
}

const PAGE_SIZE = 12;

const Used = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const statusLabel: Record<string, { text: string; color: string }> = {
    selling: { text: t('used.status.selling'), color: 'bg-mint/20 text-emerald-700' },
    reserved: { text: t('used.status.reserved'), color: 'bg-yellow-100 text-yellow-700' },
    sold: { text: t('used.status.sold'), color: 'bg-gray-200 text-gray-500' },
  };

  const categories = [
    { id: 'all', name: t('used.cat.all') },
    { id: 'ski', name: t('used.cat.ski') },
    { id: 'board', name: t('used.cat.board') },
    { id: 'boots', name: t('used.cat.boots') },
    { id: 'binding', name: t('used.cat.binding') },
    { id: 'helmet', name: t('used.cat.helmet') },
    { id: 'goggles', name: t('used.cat.goggles') },
    { id: 'wear', name: t('used.cat.wear') },
    { id: 'etc', name: t('used.cat.etc') },
  ];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ category: 'used', limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedCategory !== 'all') params.set('subcategory', selectedCategory);
        if (debouncedSearch) params.set('search', debouncedSearch);
        const data = await api<{ products: Product[]; totalCount: number }>(`/products?${params}`);
        setProducts(data.products);
        setTotalCount(data.totalCount);
      } catch {
        setProducts([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, debouncedSearch, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('used.title')}</h1>
        <Link
          to="/used/register"
          className="px-4 py-1.5 bg-mint text-black rounded-lg font-bold text-xs hover:bg-emerald-300 transition-colors whitespace-nowrap"
        >
          {t('used.register')}
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('used.search')}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-all"
      />

      {/* Categories */}
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
        <div className="text-center py-12 text-gray-400 text-sm">{t('general.loading')}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => {
            const st = statusLabel[product.status] || statusLabel.selling;
            return (
              <Link to={`/used/${product.id}`} key={product.id} className={`card overflow-hidden card-hover block ${product.status === 'sold' ? 'opacity-60' : ''}`}>
                <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
                  {product.image.startsWith('/') || product.image.startsWith('http') ? (
                    <img src={imageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:2rem">📷</span>'; }} />
                  ) : (
                    product.image
                  )}
                  {product.isPremium && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/90 text-white shadow-sm">PREMIUM</span>
                  )}
                  {product.status !== 'selling' && (
                    <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.text}</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[10px] text-accent-light font-medium uppercase tracking-wider">{product.brand}</div>
                  <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{product.name}</h3>
                  <span className="text-base font-bold text-mint">{product.price.toLocaleString()}원</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-12 text-gray-400 card text-sm">
          {t('used.noItems')}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Used;
