import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VERTICALS, getActiveVertical } from '../config/verticals';

// PAN 우산 브랜드 스트립 — Navbar 위에 얇게 표시.
// 좌측: "PAN" 로고 (Hub 로 이동)
// 우측: 현재 버티컬 표시 + 다른 플랫폼 스위처 (drop-down)
//
// PanHub 자체에서는 숨김 (이미 PAN 페이지라 중복).

export default function PanTopBar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = getActiveVertical();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // /pan 페이지에서는 숨김
  if (location.pathname === '/pan') return null;

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 h-7 flex items-center justify-between text-[10px] tracking-wider">
        <Link to="/pan" className="font-black tracking-[0.2em] hover:text-gray-300 transition-colors" aria-label="PAN 플랫폼 허브">
          PAN
        </Link>
        <div ref={containerRef} className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-1 font-bold hover:text-gray-300 transition-colors min-h-7 px-1"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span>{active.name}</span>
            <span aria-hidden className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {open && (
            <div role="menu" className="absolute right-0 top-full mt-1 w-56 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-500 tracking-wider border-b border-gray-100">
                PAN 플랫폼 선택
              </div>
              {VERTICALS.map(v => {
                const isCurrent = v.slug === active.slug;
                const disabled = v.status !== 'active' && !isCurrent;
                const cls = `flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  isCurrent
                    ? 'bg-gray-50 text-gray-900 cursor-default'
                    : disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                }`;
                const inner = (
                  <>
                    <span className="text-lg" aria-hidden>{v.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold leading-tight">{v.name}</div>
                      <div className="text-[10px] text-gray-500 leading-tight">{v.tagline}</div>
                    </div>
                    {isCurrent && <span className="text-[9px] font-bold text-sky-600">현재</span>}
                    {disabled && <span className="text-[9px] font-bold text-gray-400">준비중</span>}
                  </>
                );
                if (isCurrent || disabled) {
                  return <div key={v.slug} className={cls} role="menuitem" aria-disabled={disabled}>{inner}</div>;
                }
                return (
                  <Link key={v.slug} to={v.basePath} className={cls} role="menuitem" onClick={() => setOpen(false)}>{inner}</Link>
                );
              })}
              <Link to="/pan" onClick={() => setOpen(false)} className="block px-3 py-2 text-[11px] font-bold text-sky-600 text-center border-t border-gray-100 hover:bg-gray-50">
                전체 보기 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
