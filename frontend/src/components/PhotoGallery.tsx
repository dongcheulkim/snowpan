import { useState, useRef } from 'react';
import { imageUrl } from '../api';

// 상세 페이지 사진 캐러셀 — 콤마 구분 URL 문자열. 한 장씩 스와이프(가로 스크롤 스냅).
// 에어비앤비/인스타 패턴: 세로·가로 사진 섞여도 예쁘게 — 블러 배경 채움 + object-contain,
// 하단 점 인디케이터 + 우상단 카운터.
export default function PhotoGallery({ images }: { images?: string | null }) {
  const urls = (images || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

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
          <div key={i} className="snap-center shrink-0 w-full aspect-[4/3] relative overflow-hidden">
            {/* 블러 배경 채움 — 사진 비율 달라도 여백이 깔끔 */}
            <img src={imageUrl(u, 400)} aria-hidden alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            <img
              src={imageUrl(u, 1000)}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className="relative w-full h-full object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          </div>
        ))}
      </div>

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
    </div>
  );
}
