import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { ChatIcon, CloseIcon, PackageIcon, SadIcon, SearchIcon } from '../components/Icons';
import { MaintenanceIcon, SecondHandIcon, SkiShopIcon } from '../components/CategoryIcons';
import { communityCategoryLabel } from '../utils/communityLabels';

interface SearchResult {
  products: { id: string; name: string; price: number; brand: string; image: string }[];
  posts: { id: string; title: string; category: string; sport: string }[];
  shops: { id: string; name: string; area: string; type: string }[];
}

export default function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // URL 의 ?q= 를 초기값으로 — 공유 링크·구글 SearchAction 유입 시 바로 검색.
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      // 입력 → URL 동기화 (공유·뒤로가기 대응). replace 로 히스토리 오염 방지.
      const cur = searchParams.get('q') || '';
      if (cur !== query) {
        const next = new URLSearchParams(searchParams);
        if (query) next.set('q', query); else next.delete('q');
        setSearchParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!debounced) { setResults(null); return; }
    setLoading(true);
    api<SearchResult>(`/search?q=${encodeURIComponent(debounced)}`)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debounced]);

  const hasResults = results && (results.products.length > 0 || results.posts.length > 0 || results.shops.length > 0);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-4">
      {/* 검색 입력 */}
      <div className="flex items-center gap-3 bg-snow rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
        <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="장비, 게시글, 스키샵 검색..."
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} aria-label="지우기" className="text-gray-500 hover:text-gray-500"><CloseIcon size={16} /></button>
        )}
      </div>

      {/* 검색 전 안내 */}
      {!debounced && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500"><SearchIcon size={44} strokeWidth={1.4} /></div>
          <p className="text-sm text-gray-500">중고장비, 커뮤니티 글, 스키샵을 검색해보세요</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && <div className="text-center py-12 text-sm text-gray-500 animate-pulse">검색 중...</div>}

      {/* 결과 없음 */}
      {!loading && debounced && !hasResults && (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500"><SadIcon size={44} strokeWidth={1.4} /></div>
          <p className="text-sm text-gray-500">"{debounced}"에 대한 검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 중고장비 결과 */}
      {!loading && results?.products && results.products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5"><SecondHandIcon size={16} /> 중고장비</h2>
            <Link to={`/used?search=${encodeURIComponent(debounced)}`} className="text-xs text-sky-600">더보기</Link>
          </div>
          <div className="space-y-2">
            {results.products.map(p => (
              <Link key={p.id} to={`/used/${p.id}`} className="card p-3 flex items-center gap-3 card-hover block">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {(p.image?.startsWith('http') || p.image?.startsWith('/')) ? (
                    <img src={imageUrl(p.image, 200)} alt={p.name} loading="lazy" className="w-full h-full object-cover" onError={e => { const i = e.target as HTMLImageElement; if (!i.dataset.fallback) { i.dataset.fallback = '1'; i.src = '/icons/placeholder-card.svg'; } }} />
                  ) : <span className="flex items-center justify-center w-full h-full text-gray-500"><PackageIcon size={20} /></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.brand}</p>
                </div>
                <span className="text-sm font-bold text-sky-600 flex-shrink-0">{p.price.toLocaleString()}원</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 커뮤니티 결과 */}
      {!loading && results?.posts && results.posts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2 px-1 inline-flex items-center gap-1.5"><ChatIcon size={16} /> 커뮤니티</h2>
          <div className="card overflow-hidden">
            {results.posts.map((p, idx) => (
              <Link key={p.id} to={`/community/post/${p.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${idx < results.posts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{communityCategoryLabel(p.category, p.sport)}</span>
                <span className="text-sm text-gray-900 flex-1 truncate">{p.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 샵 결과 */}
      {!loading && results?.shops && results.shops.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2 px-1 inline-flex items-center gap-1.5"><SkiShopIcon size={16} /> 스키샵 · 정비샵</h2>
          <div className="space-y-2">
            {results.shops.map(s => (
              <Link key={`${s.type}-${s.id}`} to={s.type === 'ski' ? '/new-equipment' : '/repair'} className="card p-3 flex items-center gap-3 card-hover block">
                <span className="text-gray-700">{s.type === 'ski' ? <SkiShopIcon size={22} /> : <MaintenanceIcon size={22} />}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-500">{s.area}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
