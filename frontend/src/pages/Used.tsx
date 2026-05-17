import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import Pagination from '../components/Pagination';
import { ProductGridSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { PackageIcon } from '../components/Icons';
import CategoryAdBanner from '../components/CategoryAdBanner';
import CategoryPlaceholder from '../components/CategoryPlaceholder';
import { toastError } from '../components/Toast';
import { useVertical } from '../hooks/useVertical';

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
  size?: string | null;
}

const PAGE_SIZE = 12;

const Used = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialSearch = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, setLangTick] = useState(0);

  const updateParam = (key: string, value: string | null, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || (key === 'category' && value === 'all') || (key === 'sort' && value === 'newest')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: false });
  };
  const setSelectedCategory = (v: string) => updateParam('category', v);
  const setSort = (v: string) => updateParam('sort', v);
  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete('page'); else next.set('page', String(p));
    setSearchParams(next, { replace: false });
  };

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const statusLabel: Record<string, { text: string; color: string }> = {
    selling: { text: t('used.status.selling'), color: 'bg-mint/20 text-emerald-700' },
    reserved: { text: t('used.status.reserved'), color: 'bg-yellow-100 text-yellow-700' },
    sold: { text: t('used.status.sold'), color: 'bg-gray-200 text-gray-500' },
  };

  // 카테고리는 vertical-specific — config 에서 가져옴.
  // snow 면 i18n 라벨 (스키/보드/부츠 등), 다른 vertical 은 config 의 한글 라벨 그대로.
  const vertical = useVertical();
  const verticalCats = vertical.usedSubcategories || [];
  const categories = [
    { id: 'all', name: t('used.cat.all') },
    ...verticalCats.map(c => ({
      id: c.id,
      // snow vertical 의 8개 기본 카테고리는 i18n 키 매핑
      name: vertical.slug === 'snow' && ['ski','board','boots','binding','helmet','goggles','wear','etc'].includes(c.id)
        ? t(`used.cat.${c.id}`)
        : c.label,
    })),
  ];

  // Debounce search → URL (replace, not push, to avoid history spam)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      const currentQ = searchParams.get('q') || '';
      if (currentQ !== searchQuery) {
        const next = new URLSearchParams(searchParams);
        if (searchQuery) next.set('q', searchQuery); else next.delete('q');
        next.delete('page');
        setSearchParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ category: 'used', limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedCategory !== 'all') params.set('subcategory', selectedCategory);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (sort && sort !== 'newest') params.set('sort', sort);
        const data = await api<{ products: Product[]; totalCount: number }>(`/products?${params}`);
        setProducts(data.products);
        setTotalCount(data.totalCount);
      } catch (err) {
        setProducts([]);
        setTotalCount(0);
        toastError(err instanceof Error ? err.message : '매물 목록을 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, debouncedSearch, page, sort]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('used.title')}</h1>
        {/* 태블릿+ 에서만 헤더 우측 버튼, 모바일은 FAB 사용 */}
        <Link
          to="/used/register"
          className="hidden sm:inline-block px-4 py-1.5 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          {t('used.register')}
        </Link>
      </div>

      {/* 모바일 FAB — 엄지로 쉽게 닿는 우하단 */}
      <Link
        to="/used/register"
        aria-label="장비 등록"
        className="sm:hidden fixed right-4 bottom-20 z-30 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg active:scale-95 flex items-center justify-center hover:bg-gray-800 transition-all"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </Link>

      <CategoryAdBanner category="used" />

      {/* Search + Sort */}
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="상품 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('used.search')}
          className="flex-1 min-w-0 px-4 py-2.5 bg-snow border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-all"
        />
        <select
          aria-label="정렬 기준"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 bg-snow border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-accent/50 transition-all"
        >
          <option value="newest">최신순</option>
          <option value="price_asc">가격↑</option>
          <option value="price_desc">가격↓</option>
        </select>
      </div>

      {(selectedCategory !== 'all' || searchQuery || sort !== 'newest') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500">적용된 필터:</span>
          {selectedCategory !== 'all' && <span className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded">{categories.find(c => c.id === selectedCategory)?.name}</span>}
          {searchQuery && <span className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded">"{searchQuery}"</span>}
          {sort !== 'newest' && <span className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded">{sort === 'price_asc' ? '가격↑' : '가격↓'}</span>}
          <button
            onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setSearchParams({}, { replace: false }); }}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-snow border border-gray-300 text-gray-700 rounded-full hover:bg-coral/10 hover:border-coral/30 hover:text-coral transition-colors"
            aria-label="필터 초기화"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            초기화
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 snap-start ${
              selectedCategory === cat.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-gray-50 to-transparent" />
      </div>

      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((product) => {
            const st = statusLabel[product.status] || statusLabel.selling;
            return (
              <Link to={`/used/${product.id}`} key={product.id} className={`card overflow-hidden card-hover block ${product.status === 'sold' ? 'opacity-60' : ''}`}>
                <div className="relative h-28 flex items-center justify-center text-4xl overflow-hidden bg-gray-100">
                  {product.image.startsWith('/') || product.image.startsWith('http') ? (
                    <img
                      src={imageUrl(product.image, 400)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.fallback) {
                          img.dataset.fallback = '1';
                          img.style.display = 'none';
                          const ph = img.parentElement?.querySelector('[data-placeholder]') as HTMLElement;
                          if (ph) ph.style.display = '';
                        }
                      }}
                    />
                  ) : null}
                  {/* 카테고리 일러스트 폴백 — 사진 없거나 로드 실패 시 */}
                  <div data-placeholder className="absolute inset-0" style={{ display: (product.image.startsWith('/') || product.image.startsWith('http')) ? 'none' : 'block' }}>
                    <CategoryPlaceholder subcategory={product.subcategory} />
                  </div>
                  {product.isPremium && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>
                  )}
                  {product.status !== 'selling' && (
                    <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.text}</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-accent-light font-medium uppercase tracking-wider">{product.brand}</span>
                    {product.size && <span className="text-[9px] text-gray-500 bg-gray-50 px-1 rounded">{product.size}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{product.name}</h3>
                  <span className="text-base font-bold text-mint">{product.price.toLocaleString()}원</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && products.length === 0 && (
        <EmptyState
          icon={<PackageIcon size={48} strokeWidth={1.4} />}
          title={t('used.noItems')}
          description="다른 키워드로 검색하거나 직접 장비를 등록해보세요."
          ctaLabel="+ 내 장비 등록하기"
          ctaTo="/used/register"
        />
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Used;
