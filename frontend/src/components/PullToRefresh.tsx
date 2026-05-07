import { useEffect, useRef, useState } from 'react';

// 모바일 pull-to-refresh — 페이지 최상단에서 손가락을 아래로 드래그하면 새로고침.
// 임계치 (THRESHOLD_PX) 넘기면 release 시 reload, 그 미만이면 원위치 복귀.

const THRESHOLD_PX = 80;
const MAX_PULL_PX = 120;
const RESIST = 0.55; // 손가락 이동의 절반만 따라옴 (저항감)

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    // 데스크탑 (마우스/포인터 가능 + hover) 에서는 비활성. 모바일 터치만.
    const mqHover = window.matchMedia('(hover: hover)');
    if (mqHover.matches) return;

    const onTouchStart = (e: TouchEvent) => {
      // 페이지 최상단일 때만 활성
      if (window.scrollY > 0) return;
      // 하나의 손가락만
      if (e.touches.length !== 1) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPullY(0);
        return;
      }
      // 스크롤 위치가 사용자 인터랙션 중 0이 아니면 (스크롤 일어나면) 취소
      if (window.scrollY > 0) {
        activeRef.current = false;
        setPullY(0);
        return;
      }
      // 사용자가 위에서 아래로 드래그 중 — 기본 새로고침 동작 (iOS rubber-band) 막음
      e.preventDefault();
      setPullY(Math.min(MAX_PULL_PX, dy * RESIST));
    };

    const onTouchEnd = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      startYRef.current = null;
      setPullY((y) => {
        if (y >= THRESHOLD_PX) {
          setRefreshing(true);
          // 약간의 지연 — 사용자에게 시각적으로 트리거 확인 시간
          setTimeout(() => window.location.reload(), 300);
          return THRESHOLD_PX;
        }
        return 0;
      });
    };

    // passive: false 로 preventDefault 가능
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  if (pullY === 0 && !refreshing) return null;

  const progress = Math.min(1, pullY / THRESHOLD_PX);
  const ready = progress >= 1;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[70] flex justify-center pointer-events-none"
      style={{ transform: `translateY(${pullY - 40}px)`, transition: refreshing ? 'transform 0.2s' : 'none' }}
    >
      <div className={`mt-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-md text-[11px] font-bold transition-colors ${ready || refreshing ? 'text-sky-600' : 'text-gray-500'}`}>
        {refreshing ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            새로고침 중…
          </span>
        ) : ready ? '놓으면 새로고침' : '당겨서 새로고침'}
      </div>
    </div>
  );
}
