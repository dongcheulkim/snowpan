import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { imageUrl } from '../api';
import { hasMouse } from '../utils/pointer';

// 상세 페이지 사진 캐러셀 — 콤마 구분 URL 문자열. 한 장씩 스와이프(가로 스크롤 스냅).
// 에어비앤비/인스타 패턴: 세로·가로 사진 섞여도 예쁘게 — 블러 배경 채움 + object-contain,
// 하단 점 인디케이터 + 우상단 카운터.
// 사진을 누르면 전체화면 크게보기 — 옆으로 넘기기, 한 번 더 누르면 확대(끌어서 이동), 닫기·ESC. 사용자 요청 2026-09-22
export default function PhotoGallery({ images }: { images?: string | null }) {
  const urls = (images || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // 전체화면 뷰어 상태
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const tapPos = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const openViewer = (i: number) => { setBig(i); setZoomed(false); setOpen(true); };
  const closeViewer = () => { setOpen(false); setZoomed(false); };
  const goBig = (i: number) => {
    const el = viewerRef.current;
    if (!el || i < 0 || i >= urls.length) return;
    setZoomed(false);
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  // 뷰어 열림: 배경 스크롤 잠금 + 현재 사진 위치로
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = viewerRef.current;
    if (el) el.scrollTo({ left: big * el.clientWidth });
    return () => { document.body.style.overflow = prevOverflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // 키보드: ESC 닫기, 좌우 화살표 넘기기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft') goBig(big - 1);
      else if (e.key === 'ArrowRight') goBig(big + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, big]);
  // 확대 직후 — 누른 지점이 화면 가운데 오도록 스크롤
  useEffect(() => {
    if (!zoomed) return;
    const slide = viewerRef.current?.children[big] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollTo({
      left: tapPos.current.x * slide.scrollWidth - slide.clientWidth / 2,
      top: tapPos.current.y * slide.scrollHeight - slide.clientHeight / 2,
    });
  }, [zoomed, big]);

  const onViewerScroll = () => {
    const el = viewerRef.current;
    if (!el || zoomed) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== big && i >= 0 && i < urls.length) setBig(i);
  };
  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    tapPos.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    setZoomed((z) => !z);
  };

  // 매물 전환 등으로 사진 목록이 바뀌면 첫 장부터 (stale index 방지)
  useEffect(() => {
    setIdx(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [images]);

  if (!urls.length) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx && i >= 0 && i < urls.length) setIdx(i);
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-100 select-none">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {urls.map((u, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            aria-label="사진 크게 보기"
            onClick={() => openViewer(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(i); } }}
            className="snap-center shrink-0 w-full aspect-[4/3] relative overflow-hidden cursor-zoom-in"
          >
            {/* 블러 배경 채움 — 사진 비율 달라도 여백이 깔끔 */}
            <img src={imageUrl(u, 400)} aria-hidden alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            <img
              src={imageUrl(u, 1000)}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className="relative w-full h-full object-contain"
              // 현재 슬라이드만 이름 부여 — 목록 카드에서 이어지는 shared element 전환 대상
              style={i === idx ? { viewTransitionName: 'hero-img' } : undefined}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          </div>
        ))}
      </div>

      {/* PC(마우스) — 스와이프 대신 화살표로 넘기기 */}
      {hasMouse && urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 사진"
            onClick={() => goTo(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center disabled:opacity-25 hover:bg-black/65 transition-colors z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            aria-label="다음 사진"
            onClick={() => goTo(Math.min(urls.length - 1, idx + 1))}
            disabled={idx === urls.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center disabled:opacity-25 hover:bg-black/65 transition-colors z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}
      {urls.length > 1 && (
        <>
          {/* 카운터 */}
          <div className="absolute top-2.5 right-2.5 bg-black/55 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full pointer-events-none">
            {idx + 1} / {urls.length}
          </div>
          {/* 점 인디케이터 */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 사진`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/55'}`}
              />
            ))}
          </div>
        </>
      )}

      {/* 전체화면 크게보기 — 갤러리 카드가 overflow-hidden 이라 body 에 포털로 띄움 */}
      {open && createPortal(
        <div className="fixed inset-0 z-[80] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="사진 크게 보기">
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 text-white pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <span className="text-xs font-medium bg-black/50 px-2.5 py-1 rounded-full">{big + 1} / {urls.length}</span>
            <button
              type="button"
              aria-label="닫기"
              onClick={closeViewer}
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div
            ref={viewerRef}
            onScroll={onViewerScroll}
            className={`flex-1 min-h-0 flex snap-x snap-mandatory ${zoomed ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {urls.map((u, i) => (
              <div
                key={i}
                onClick={toggleZoom}
                className={`snap-center shrink-0 w-full h-full ${zoomed && i === big ? 'overflow-auto cursor-zoom-out' : 'flex items-center justify-center overflow-hidden cursor-zoom-in'}`}
                style={{ scrollbarWidth: 'none' }}
              >
                <img
                  src={imageUrl(u, 2000)}
                  alt=""
                  draggable={false}
                  loading={i === big ? 'eager' : 'lazy'}
                  className={zoomed && i === big ? 'max-w-none w-[250%] block' : 'max-w-full max-h-full w-auto h-auto object-contain'}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                />
              </div>
            ))}
          </div>
          {hasMouse && urls.length > 1 && !zoomed && (
            <>
              <button type="button" aria-label="이전 사진" onClick={() => goBig(big - 1)} disabled={big === 0} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-25 hover:bg-white/30 transition-colors z-10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button type="button" aria-label="다음 사진" onClick={() => goBig(big + 1)} disabled={big === urls.length - 1} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-25 hover:bg-white/30 transition-colors z-10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          )}
          <p className="absolute bottom-0 inset-x-0 text-center text-white/60 text-[11px] pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}>
            {zoomed ? '끌어서 이동 · 한 번 더 누르면 원래 크기' : urls.length > 1 ? '누르면 확대 · 옆으로 넘기면 다음 사진' : '누르면 확대'}
          </p>
        </div>,
        document.body,
      )}
    </div>
  );
}
