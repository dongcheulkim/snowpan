import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { ChatIcon, CloseIcon, PackageIcon, SadIcon, SearchIcon } from '../components/Icons';
import { MaintenanceIcon, SecondHandIcon, SkiShopIcon } from '../components/CategoryIcons';
import { communityCategoryLabel } from '../utils/communityLabels';
import { useVertical } from '../hooks/useVertical';
import LoadError from '../components/LoadError';

interface SearchResult {
  products: { id: string; name: string; price: number; brand: string; image: string }[];
  posts: { id: string; title: string; category: string; sport: string }[];
  shops: { id: string; name: string; area: string; type: string }[];
}

const RECENT_KEY = 'snowpan:recent-searches';
const SUGGEST_LABEL: Record<string, string> = { resort: '스키장', skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소', brand: '브랜드', product: '중고' };

export default function Search() {
  const inputRef = useRef<HTMLInputElement>(null);
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const vbase = isSnow ? '' : vertical.basePath;
  const [searchParams, setSearchParams] = useSearchParams();
  // URL 의 ?q= 를 초기값으로 — 공유 링크·구글 SearchAction 유입 시 바로 검색.
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null); // 검색 요청 실패 메시지 ("결과 없음"과 구분)
  const [retryKey, setRetryKey] = useState(0); // '다시 시도' — 같은 검색어로 재요청
  // 최근 검색어 (이 기기에만 저장, 최대 10개) + 자동완성 (2026-09-25)
  const [recent, setRecent] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 10) : []; } catch { return []; } });
  const [suggestions, setSuggestions] = useState<{ text: string; type: string }[]>([]);
  useEffect(() => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* 저장 불가 환경 */ } }, [recent]);
  const rememberQuery = useCallback((q: string) => { const v = q.trim(); if (v.length < 2) return; setRecent((prev) => [v, ...prev.filter((x) => x !== v)].slice(0, 10)); }, []);
  const removeRecent = (q: string) => setRecent((prev) => prev.filter((x) => x !== q));

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
    if (!debounced) { setResults(null); setLoadError(null); return; }
    setLoading(true);
    setLoadError(null);
    api<SearchResult>(`/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => { setResults(r); rememberQuery(debounced); })
      .catch((err) => { setResults(null); setLoadError(err instanceof Error ? err.message : '검색 결과를 불러오지 못했어요.'); })
      .finally(() => setLoading(false));
  }, [debounced, retryKey, rememberQuery]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      api<{ text: string; type: string }[]>(`/search/suggest?q=${encodeURIComponent(q)}`)
        .then((list) => { if (alive) setSuggestions((list || []).filter((x) => x.text.toLowerCase() !== q.toLowerCase())); })
        .catch(() => { if (alive) setSuggestions([]); });
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

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
          placeholder={isSnow ? "장비, 게시글, 스키·보드샵 검색..." : "장비, 게시글 검색..."}
          className="flex-1 min-w-0 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent" // min-w-0: 사파리는 input 의 기본 최소 너비 때문에 flex 줄이 넘쳐 지우기 버튼이 화면 밖으로 밀림 (2026-09-24 WebKit 검사)
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} aria-label="지우기" className="text-gray-500 hover:text-gray-500"><CloseIcon size={16} /></button>
        )}
      </div>

      {/* 추천 검색어 — 입력 중일 때 매장·매물·리조트 이름에서 (탭하면 그 이름으로 검색) */}
      {query.trim() && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((sg) => (
            <button key={`${sg.type}:${sg.text}`} type="button" onClick={() => setQuery(sg.text)} className="min-h-9 px-3 rounded-full border border-gray-200 bg-white text-xs text-gray-800 hover:bg-gray-50">
              {sg.text}<span className="text-gray-500 ml-1">{SUGGEST_LABEL[sg.type] || ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* 최근 검색어 — 입력 전 (이 기기에만 저장) */}
      {!query.trim() && recent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-900">최근 검색어</p>
            <button type="button" onClick={() => setRecent([])} className="text-[11px] text-gray-500 hover:text-gray-900">모두 지우기</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <span key={r} className="inline-flex items-center rounded-full border border-gray-200 bg-white text-xs text-gray-800">
                <button type="button" onClick={() => setQuery(r)} className="min-h-9 pl-3 pr-1">{r}</button>
                <button type="button" onClick={() => removeRecent(r)} aria-label={`${r} 지우기`} className="min-h-9 pr-2 pl-1 text-gray-500 hover:text-gray-900"><CloseIcon size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 검색 전 안내 */}
      {!debounced && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500"><SearchIcon size={44} strokeWidth={1.4} /></div>
          <p className="text-sm text-gray-500">{isSnow ? '중고장비, 커뮤니티 글, 스키·보드샵을 검색해보세요' : '중고장비, 커뮤니티 글을 검색해보세요'}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && <div className="text-center py-12 text-sm text-gray-500 animate-pulse">검색 중...</div>}

      {/* 요청 실패 — "결과 없음"과 구분해 재시도 안내 */}
      {!loading && debounced && loadError && (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      )}

      {/* 결과 없음 */}
      {!loading && debounced && !loadError && !hasResults && (
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
            <Link to={`${vbase}/used?q=${encodeURIComponent(debounced)}`} className="text-xs text-sky-600">더보기</Link>
          </div>
          <div className="space-y-2">
            {results.products.map(p => (
              <Link key={p.id} to={`${vbase}/used/${p.id}`} className="card p-3 flex items-center gap-3 card-hover block">
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
              <Link key={p.id} to={`${vbase}/community/post/${p.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${idx < results.posts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{communityCategoryLabel(p.category, p.sport)}</span>
                <span className="text-sm text-gray-900 flex-1 truncate">{p.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 샵 결과 */}
      {!loading && isSnow && results?.shops && results.shops.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2 px-1 inline-flex items-center gap-1.5"><SkiShopIcon size={16} /> 스키·보드샵 · 정비샵</h2>
          <div className="space-y-2">
            {results.shops.map(s => (
              <Link key={`${s.type}-${s.id}`} to={s.type === 'ski' ? `/skishop/${s.id}` : `/repair/${s.id}`} className="card p-3 flex items-center gap-3 card-hover block">
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
