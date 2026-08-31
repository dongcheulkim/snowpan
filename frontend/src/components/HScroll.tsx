import { useEffect, useRef, useState, type ReactNode } from 'react';
import { hasMouse } from '../utils/pointer';

// 가로 스크롤 행 래퍼 — PC(마우스) 환경에서 내용이 넘칠 때만 좌우 화살표를 띄운다.
// 터치 기기는 스와이프가 자연스러우므로 기존 마크업 그대로 통과.
export default function HScroll({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  useEffect(() => {
    if (!hasMouse) return;
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanL(el.scrollLeft > 8);
      setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // 칩이 비동기 데이터로 늦게 채워지는 행 대응
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); mo.disconnect(); };
  }, []);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  if (!hasMouse) return <div className={className}>{children}</div>;

  const btn = 'absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 border border-gray-200 shadow-sm text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors';
  return (
    <div className="relative">
      {canL && (
        <button type="button" aria-label="왼쪽으로" onClick={() => nudge(-1)} className={`${btn} left-0`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div ref={ref} className={className}>{children}</div>
      {canR && (
        <button type="button" aria-label="오른쪽으로" onClick={() => nudge(1)} className={`${btn} right-0`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>
  );
}
