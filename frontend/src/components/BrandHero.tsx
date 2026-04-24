// 브랜드 소개 배너 — 브랜드북의 "BRAND EXTENSION" 영역 레이아웃을 웹 배너 비율로 축약.
// SNOW PAN 워드마크 + 키 메시지 + 3개 브랜드 컨셉 아이콘 (∞ / 산 / 눈송이).
// 홈 상단에 항상 노출 (광고 슬롯과 별개).

const SnowPanMark = ({ className }: { className?: string }) => (
  <span
    className={`inline-flex items-baseline select-none ${className ?? ''}`}
    style={{
      fontFamily: '"Helvetica Neue", Helvetica, "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}
  >
    SNOW&nbsp;P
    <svg viewBox="0 0 60 72" width="0.58em" height="0.7em" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'baseline', marginLeft: '0.04em', marginRight: '0.04em' }}>
      <polyline points="6,68 30,6 54,68" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
    N
  </span>
);

const InfinityIcon = () => (
  <svg viewBox="0 0 40 24" width="36" height="22" aria-hidden="true">
    <path d="M8 12 C 8 6, 18 6, 18 12 C 18 18, 8 18, 8 12 Z M 22 12 C 22 6, 32 6, 32 12 C 32 18, 22 18, 22 12 Z" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const MountainGlyph = () => (
  <svg viewBox="0 0 40 24" width="36" height="22" aria-hidden="true">
    <polyline points="4,22 14,6 22,16 28,10 36,22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SnowflakeGlyph = () => {
  const arm = (
    <g>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="12" y1="6" x2="9" y2="9" />
      <line x1="12" y1="6" x2="15" y2="9" />
      <line x1="12" y1="18" x2="9" y2="15" />
      <line x1="12" y1="18" x2="15" y2="15" />
    </g>
  );
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {arm}
        <g transform="rotate(60 12 12)">{arm}</g>
        <g transform="rotate(120 12 12)">{arm}</g>
      </g>
    </svg>
  );
};

export default function BrandHero() {
  return (
    <section
      aria-label="스노우판 소개"
      className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 px-5 py-6 sm:px-8 sm:py-8 shadow-sm"
    >
      {/* 상단: 워드마크 */}
      <div className="flex items-center justify-center">
        <SnowPanMark className="text-gray-900 text-[28px] sm:text-[40px]" />
      </div>

      {/* 중간: 키 메시지 */}
      <div className="mt-3 text-center">
        <p className="text-sm sm:text-base font-bold text-gray-900">
          설원 위의 자유, 끝없는 플레이의 장
        </p>
        <p className="mt-0.5 text-[10px] sm:text-xs text-gray-400 tracking-[0.18em] font-medium">
          FREEDOM ON THE SNOW · ENDLESS PLAYGROUND
        </p>
      </div>

      {/* 하단: 브랜드 컨셉 3요소 */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-around text-gray-700">
        <div className="flex flex-col items-center gap-1.5">
          <InfinityIcon />
          <span className="text-[10px] font-semibold text-gray-600">플레이의 무한함</span>
        </div>
        <div className="w-px h-10 bg-gray-100" />
        <div className="flex flex-col items-center gap-1.5">
          <MountainGlyph />
          <span className="text-[10px] font-semibold text-gray-600">지평선 · 무대</span>
        </div>
        <div className="w-px h-10 bg-gray-100" />
        <div className="flex flex-col items-center gap-1.5">
          <SnowflakeGlyph />
          <span className="text-[10px] font-semibold text-gray-600">설원 · 자유</span>
        </div>
      </div>
    </section>
  );
}
