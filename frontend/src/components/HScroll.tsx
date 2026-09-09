import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { hasMouse } from '../utils/pointer';

// 가로 스크롤 행 래퍼 — PC(마우스) 환경에서 내용이 넘칠 때만 좌우 화살표를 띄운다.
// 터치 기기는 스와이프가 자연스러우므로 기존 마크업 그대로 통과.
//
// autoScrollMs: 넣으면 그 간격으로 한 칸씩 자동으로 넘어간다(끝에 닿으면 처음으로).
//   손으로 만지는 동안엔 멈추고 손을 뗀 뒤 잠시 있다가 다시 돈다. 화면 밖·다른 탭·모션 최소화 설정에선 돌지 않는다.
// drag: PC 에서 마우스로 끌어서 넘길 수 있게. 끌었을 때는 카드 클릭이 눌리지 않는다(터치는 원래 스와이프됨).
interface Props {
  className?: string;
  children: ReactNode;
  autoScrollMs?: number;
  drag?: boolean;
  noArrows?: boolean; // 좌우 화살표 숨김 (자동 슬라이드·드래그로 넘기는 행)
}

const RESUME_DELAY = 4000; // 손 뗀 뒤 이만큼 있다가 자동 슬라이드 재개

export default function HScroll({ className = '', children, autoScrollMs, drag, noArrows }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  useEffect(() => {
    if (!hasMouse || noArrows) return;
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
  }, [noArrows]);

  // ── 자동 슬라이드
  const pausedUntil = useRef(0);
  const pause = useCallback(() => { pausedUntil.current = Date.now() + RESUME_DELAY; }, []);
  useEffect(() => {
    if (!autoScrollMs) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.3 });
    io.observe(el);

    // 손이 닿아 있는 동안·직후엔 멈춤
    const onDown = () => pause();
    const onWheel = () => pause();
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('mouseenter', onDown);

    const timer = window.setInterval(() => {
      if (!visible || document.hidden || Date.now() < pausedUntil.current) return;
      const kids = el.children;
      if (kids.length < 2) return;
      // 카드 한 칸 = 다음 카드 시작 위치 차이 (gap 포함)
      const step = (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft || el.clientWidth * 0.7;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' });
    }, autoScrollMs);

    return () => {
      window.clearInterval(timer);
      io.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mouseenter', onDown);
    };
  }, [autoScrollMs, pause]);

  // ── 마우스로 끌어서 넘기기 (PC 전용, 터치는 브라우저 기본 스와이프)
  useEffect(() => {
    if (!drag || !hasMouse) return;
    const el = ref.current;
    if (!el) return;
    let down = false, moved = false, startX = 0, startScroll = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startScroll = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      pause();
      el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (moved) {
        // 끌고 난 직후의 클릭 한 번만 삼킨다 — 드래그가 카드 열기로 이어지지 않게
        const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
        el.addEventListener('click', swallow, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 300);
      }
      down = false; moved = false;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, pause]);

  const dragCls = drag && hasMouse ? ' cursor-grab active:cursor-grabbing select-none' : '';

  if (!hasMouse || noArrows) return <div ref={ref} className={className + dragCls}>{children}</div>;

  const nudge = (dir: -1 | 1) => {
    pause();
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const btn = 'absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 border border-gray-200 shadow-sm text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors';
  return (
    <div className="relative">
      {canL && (
        <button type="button" aria-label="왼쪽으로" onClick={() => nudge(-1)} className={`${btn} left-0`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <div ref={ref} className={className + dragCls}>{children}</div>
      {canR && (
        <button type="button" aria-label="오른쪽으로" onClick={() => nudge(1)} className={`${btn} right-0`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}
    </div>
  );
}
