import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { MaintenanceIcon, SkiShopIcon } from './CategoryIcons';
import { CloseIcon } from './Icons';
import { communityCategoryLabel } from '../utils/communityLabels';

interface SearchResult {
  products: { id: string; name: string; price: number; brand: string }[];
  posts: { id: string; title: string; category: string; sport: string }[];
  shops: { id: string; name: string; area: string; type: string }[];
}

// 빈 상태 추천 — 검색창 열렸지만 아직 미입력일 때 인기 키워드 노출.
const POPULAR_QUERIES = [
  { label: '#스키 부츠', q: '부츠' },
  { label: '#버튼 보드', q: '버튼' },
  { label: '#오클리 고글', q: '오클리' },
  { label: '#하이원 시즌권', q: '하이원' },
  { label: '#카풀', q: '카풀' },
  { label: '#용평', q: '용평' },
];

const RECENT_KEY = 'recent-searches-v1';
function getRecent(): string[] {
  try {
    const v = localStorage.getItem(RECENT_KEY);
    return v ? (JSON.parse(v) as string[]).slice(0, 5) : [];
  } catch { return []; }
}
function saveRecent(q: string) {
  if (!q || q.length < 2) return;
  try {
    const cur = getRecent().filter(x => x !== q);
    cur.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 5)));
  } catch { /* ignore */ }
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) { setResults(null); return; }
    setLoading(true);
    api<SearchResult>(`/search?q=${encodeURIComponent(debounced)}`)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path: string) => {
    if (debounced) saveRecent(debounced);
    setOpen(false); setQuery(''); navigate(path);
  };
  const recent = getRecent();

  const hasResults = results && (results.products.length > 0 || results.posts.length > 0 || results.shops.length > 0);

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      ) : (
        <div className="fixed inset-0 z-50 bg-black/30 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="max-w-lg mx-auto pt-3 px-4" onClick={e => e.stopPropagation()}>
            <div className="bg-snow rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* 입력 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
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
                  <button onClick={() => setQuery('')} aria-label="지우기" className="text-gray-500 hover:text-gray-500"><CloseIcon size={14} /></button>
                )}
              </div>

              {/* 빈 상태 — 추천 키워드 + 최근 검색 */}
              {!query && !loading && (
                <div className="px-4 py-3 space-y-3">
                  {recent.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 mb-1.5">최근 검색</div>
                      <div className="flex flex-wrap gap-1.5">
                        {recent.map(r => (
                          <button key={r} onClick={() => setQuery(r)} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 mb-1.5">인기 키워드</div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_QUERIES.map(p => (
                        <button key={p.q} onClick={() => setQuery(p.q)} className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100">
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 결과 */}
              {loading && <div className="px-4 py-6 text-center text-xs text-gray-500 animate-pulse">검색 중...</div>}

              {!loading && debounced && !hasResults && (
                <div className="px-4 py-6 text-center text-xs text-gray-500">
                  "{debounced}" 와(과) 일치하는 결과가 없습니다.
                </div>
              )}

              {!loading && hasResults && (
                <div className="max-h-[60vh] overflow-y-auto">
                  {/* 중고장비 */}
                  {results!.products.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="text-[10px] font-bold text-gray-500 mb-2">중고장비</div>
                      {results!.products.map(p => (
                        <button key={p.id} onClick={() => go(`/used/${p.id}`)} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors text-left">
                          <span className="text-sm font-medium text-gray-900 flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-sky-600 font-bold flex-shrink-0">{p.price.toLocaleString()}원</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 커뮤니티 */}
                  {results!.posts.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="text-[10px] font-bold text-gray-500 mb-2">커뮤니티</div>
                      {results!.posts.map(p => (
                        <button key={p.id} onClick={() => go(`/community/post/${p.id}`)} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors text-left">
                          <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{communityCategoryLabel(p.category, p.sport)}</span>
                          <span className="text-sm text-gray-900 flex-1 truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 샵 */}
                  {results!.shops.length > 0 && (
                    <div className="px-4 pt-3 pb-3">
                      <div className="text-[10px] font-bold text-gray-500 mb-2">스키샵 · 정비샵</div>
                      {results!.shops.map(s => (
                        <button key={`${s.type}-${s.id}`} onClick={() => go(s.type === 'ski' ? '/new-equipment' : '/repair')} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors text-left">
                          <span className="text-gray-700">{s.type === 'ski' ? <SkiShopIcon size={16} /> : <MaintenanceIcon size={16} />}</span>
                          <span className="text-sm text-gray-900 flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] text-gray-500">{s.area}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
