// 브랜드 소개 슬라이드 — 광고 배너와 같은 비율 (aspect-[3.5/1]) 의 컴팩트 버전.
// 홈 배너 rotator 의 첫 번째 슬라이드로 삽입해 광고와 함께 돌아감.

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

export default function BrandHero() {
  return (
    <div className="absolute inset-0 flex items-center px-5 sm:px-8">
      <div className="flex-1">
        <SnowPanMark className="text-gray-900 text-[18px] sm:text-[26px]" />
        <p className="mt-1 text-[11px] sm:text-sm font-semibold text-gray-800 leading-tight">
          설원 위의 자유, 끝없는 플레이의 장
        </p>
        <p className="text-[9px] sm:text-[10px] text-gray-500 tracking-[0.14em] font-medium mt-0.5">
          FREEDOM ON THE SNOW · ENDLESS PLAYGROUND
        </p>
      </div>
      <span className="text-[9px] font-bold text-gray-500 tracking-wider ml-3 flex-shrink-0">ABOUT</span>
    </div>
  );
}
