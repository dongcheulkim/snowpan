import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';
import WishlistButton from '../components/WishlistButton';
import { t, onLangChange } from '../i18n';
import Pagination from '../components/Pagination';
import { ProductGridSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { PackageIcon } from '../components/Icons';
import CategoryAdBanner from '../components/CategoryAdBanner';
import CategoryPlaceholder from '../components/CategoryPlaceholder';
import { toastError, toastSuccess } from '../components/Toast';
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
  viewCount?: number;
  wishlistCount?: number;
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
  const [wishedIds, setWishedIds] = useState<Set<string>>(new Set());
  const [, setLangTick] = useState(0);

  // 로그인 상태면 내 찜 목록 id 집합 로드 (하트 초기 상태 표시용).
  useEffect(() => {
    if (!getUser()) return;
    api<{ id: string }[] | { products?: { id: string }[]; items?: { id: string }[] }>('/products/wishlist')
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d.products || d.items || []);
        setWishedIds(new Set(arr.map((p) => p.id)));
      })
      .catch(() => {});
  }, []);

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
      name: vertical.slug === 'snow' && ['ski','board','boots','ski_boots','board_boots','binding','wear','pole','helmet','goggles','gloves','bag','accessory','etc'].includes(c.id)
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
        <h1 className="text-2xl font-bold text-gray-900">{vertical.slug === 'snow' ? t('used.title') : (vertical.pageLabels?.used || t('used.title'))}</h1>
        {/* 태블릿+ 에서만 헤더 우측 버튼, 모바일은 FAB 사용 */}
        <Link
          to="/used/register"
          className="hidden px-4 py-1.5 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          {t('used.register')}
        </Link>
      </div>

      {/* 모바일 FAB — 엄지로 쉽게 닿는 우하단 */}
      <Link
        to="/used/register"
        aria-label="장비 등록"
        className="fixed right-4 bottom-20 z-30 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg active:scale-95 flex items-center justify-center hover:bg-gray-800 transition-all"
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
          <option value="popular">인기순</option>
          <option value="price_asc">가격↑</option>
          <option value="price_desc">가격↓</option>
        </select>
      </div>

      {/* 현재 검색어 키워드 알림 등록 — 로그인 + 검색어 있을 때만 */}
      {getUser() && debouncedSearch.trim().length >= 2 && (
        <button
          onClick={async () => {
            try {
              await api('/saved-searches', { method: 'POST', body: { keyword: debouncedSearch.trim() } });
              toastSuccess(`"${debouncedSearch.trim()}" 키워드 알림 등록! 새 매물 올라오면 알려드려요.`);
            } catch (e) { toastError(e instanceof Error ? e.message : '등록 실패'); }
          }}
          className="w-full py-2 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold border border-sky-100 hover:bg-sky-100 transition-colors"
        >
          🔔 "{debouncedSearch.trim()}" 새 매물 알림받기
        </button>
      )}

      {/* Categories — 2줄 자동 래핑 그리드. 13개 모두 한눈에. */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
                    <span className="absolute top-1 left-1 text-[8px] font-bold px-1 py-px rounded bg-gold/80 text-white">AD</span>
                  )}
                  {product.status !== 'selling' && (
                    <span className={`absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.text}</span>
                  )}
                  <WishlistButton productId={product.id} initial={wishedIds.has(product.id)} />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-accent-light font-medium uppercase tracking-wider">{product.brand}</span>
                    {product.size && <span className="text-[9px] text-gray-500 bg-gray-50 px-1 rounded">{product.size}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{product.name}</h3>
                  <span className="text-base font-bold text-mint">{product.price.toLocaleString()}원</span>
                  {((product.viewCount ?? 0) > 0 || (product.wishlistCount ?? 0) > 0) && (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span className="inline-flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        {(product.viewCount ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        {(product.wishlistCount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  )}
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
