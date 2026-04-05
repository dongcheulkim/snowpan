import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUser, api } from '../api';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const path = location.pathname;
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // 채팅 대화 화면에서는 숨김
  if (path.startsWith('/chat/') && path !== '/chat/rooms') return null;

  const doSearch = (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    api<any>(`/search?q=${encodeURIComponent(q)}`)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setSearching(false));
  };

  const go = (p: string) => { setShowSearch(false); setQuery(''); setResults(null); navigate(p); };

  const items = [
    {
      label: '홈',
      path: '/',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: '커뮤니티',
      path: '/community',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      ),
    },
    {
      label: '검색',
      path: '__search__',
      icon: (_active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      label: '채팅',
      path: '/chat/rooms',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      label: 'MY',
      path: user ? '/mypage' : '/login',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const categoryMap: Record<string, string> = { free: '자유', review: '장비리뷰', resort: '스키장', tip: '초보팁' };
  const hasResults = results && (results.products?.length > 0 || results.posts?.length > 0 || results.shops?.length > 0);

  return (
    <>
      {/* 검색 모달 */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/30 animate-fade-in" onClick={() => setShowSearch(false)}>
          <div className="max-w-lg mx-auto pt-3 px-4" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }}
                  placeholder="장비, 게시글, 스키샵 검색..."
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                />
                {query && <button onClick={() => { setQuery(''); setResults(null); }} className="text-gray-300 text-sm">✕</button>}
              </div>

              {searching && <div className="px-4 py-6 text-center text-xs text-gray-400 animate-pulse">검색 중...</div>}
              {!searching && query && !hasResults && <div className="px-4 py-6 text-center text-xs text-gray-400">검색 결과가 없습니다.</div>}

              {!searching && hasResults && (
                <div className="max-h-[60vh] overflow-y-auto">
                  {results.products?.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="text-[10px] font-bold text-gray-400 mb-2">중고장비</div>
                      {results.products.map((p: any) => (
                        <button key={p.id} onClick={() => go(`/used/${p.id}`)} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 text-left">
                          <span className="text-sm font-medium text-gray-900 flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-sky-600 font-bold flex-shrink-0">{p.price?.toLocaleString()}원</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.posts?.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="text-[10px] font-bold text-gray-400 mb-2">커뮤니티</div>
                      {results.posts.map((p: any) => (
                        <button key={p.id} onClick={() => go(`/community/post/${p.id}`)} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 text-left">
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{categoryMap[p.category] || p.category}</span>
                          <span className="text-sm text-gray-900 flex-1 truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.shops?.length > 0 && (
                    <div className="px-4 pt-3 pb-3">
                      <div className="text-[10px] font-bold text-gray-400 mb-2">스키샵 · 정비샵</div>
                      {results.shops.map((s: any) => (
                        <button key={`${s.type}-${s.id}`} onClick={() => go(s.type === 'ski' ? '/new-equipment' : '/repair')} className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 text-left">
                          <span className="text-sm">{s.type === 'ski' ? '🏪' : '🔧'}</span>
                          <span className="text-sm text-gray-900 flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] text-gray-400">{s.area}</span>
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

      {/* 하단 네비 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-bottom">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          {items.map((item) => {
            if (item.path === '__search__') {
              return (
                <button
                  key="search"
                  onClick={() => setShowSearch(true)}
                  className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-gray-400"
                >
                  <div>{item.icon(false)}</div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }
            const active = item.path === '/' ? path === '/' : path.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${active ? 'text-sky-500' : 'text-gray-400'}`}
              >
                <div className={`relative ${active ? 'scale-110' : ''} transition-transform`}>
                  {item.icon(active)}
                  {active && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sky-500 rounded-full" />}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-sky-500' : 'text-gray-400'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
