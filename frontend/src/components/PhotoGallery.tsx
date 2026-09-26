import { useState, useRef, useEffect } from 'react';
import { imageUrl } from '../api';
import { hasMouse } from '../utils/pointer';
import PhotoViewer from './PhotoViewer';

// 상세 페이지 사진 캐러셀 — 콤마 구분 URL 문자열. 한 장씩 스와이프(가로 스크롤 스냅).
// 에어비앤비/인스타 패턴: 세로·가로 사진 섞여도 예쁘게 — 블러 배경 채움 + object-contain,
// 하단 점 인디케이터 + 우상단 카운터.
// 사진을 누르면 전체화면 크게보기 — 옆으로 넘기기, 한 번 더 누르면 확대(끌어서 이동), 닫기·ESC. 사용자 요청 2026-09-22
export default function PhotoGallery({ images }: { images?: string | null }) {
  const urls = (images || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // 전체화면 크게보기 (PhotoViewer) — 누른 사진 번호, null 이면 닫힘
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // 매물 전환 등으로 사진 목록이 바뀌면 첫 장부터 (stale index 방지)
  const [seenImages, setSeenImages] = useState(images);
  if (seenImages !== images) { setSeenImages(images); setIdx(0); }
  useEffect(() => { trackRef.current?.scrollTo({ left: 0 }); }, [images]);

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
            onClick={() => setViewerIndex(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewerIndex(i); } }}
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

      {viewerIndex !== null && <PhotoViewer urls={urls} index={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </div>
  );
}
