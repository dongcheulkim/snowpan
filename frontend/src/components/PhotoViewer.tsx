import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { imageUrl } from '../api';
import { hasMouse } from '../utils/pointer';

// 전체화면 사진 크게보기 — 옆으로 넘기기, 한 번 더 누르면 2.5배 확대(끌어서 이동), 닫기 버튼·ESC, PC 는 좌우 화살표.
// 상세 갤러리(PhotoGallery)·중고 매물·커뮤니티 글·매장 소식이 공용으로 쓴다. urls 는 원본 경로/URL (2000px 로 요청). 2026-09-22
export default function PhotoViewer({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [big, setBig] = useState(Math.min(Math.max(index, 0), Math.max(urls.length - 1, 0)));
  const [zoomed, setZoomed] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const tapPos = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const goBig = (i: number) => {
    const el = viewerRef.current;
    if (!el || i < 0 || i >= urls.length) return;
    setZoomed(false);
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  // 열림: 배경 스크롤 잠금 + 시작 사진 위치로
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = viewerRef.current;
    if (el) el.scrollTo({ left: big * el.clientWidth });
    return () => { document.body.style.overflow = prevOverflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 키보드: ESC 닫기, 좌우 화살표 넘기기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goBig(big - 1);
      else if (e.key === 'ArrowRight') goBig(big + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big, onClose]);
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

  const onScroll = () => {
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

  if (!urls.length) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label="사진 크게 보기">
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 text-white pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <span className="text-xs font-medium bg-black/50 px-2.5 py-1 rounded-full">{big + 1} / {urls.length}</span>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div
        ref={viewerRef}
        onScroll={onScroll}
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
  );
}
