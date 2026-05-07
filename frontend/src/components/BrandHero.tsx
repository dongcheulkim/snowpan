// 브랜드 소개 슬라이드 — 광고 배너와 같은 비율 (aspect-[3.5/1]) 의 컴팩트 버전.
// 홈 배너 rotator 의 첫 번째 슬라이드. 사진 (Unsplash, Daniel Frank) + 그라데이션 + 워드마크.

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
    <div className="absolute inset-0 overflow-hidden">
      {/* 배경 사진 — Unsplash Daniel Frank, 자유 라이선스 */}
      <picture>
        <source media="(min-width: 1024px)" srcSet="/images/hero-skislope-lg.jpg" />
        <img
          src="/images/hero-skislope-md.jpg"
          alt=""
          loading="eager"
          decoding="async"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>
      {/* 좌측 → 가독성 그라데이션 (텍스트 영역만 어둡게, 우측 사진은 살림) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
      {/* 텍스트 */}
      <div className="absolute inset-0 flex items-center px-5 sm:px-8">
        <div className="flex-1 text-white drop-shadow-sm">
          <SnowPanMark className="text-[18px] sm:text-[26px]" />
          <p className="mt-1 text-[11px] sm:text-sm font-semibold leading-tight">
            설원 위의 자유, 끝없는 플레이의 장
          </p>
          <p className="text-[9px] sm:text-[10px] tracking-[0.14em] font-medium mt-0.5 opacity-80">
            FREEDOM ON THE SNOW · ENDLESS PLAYGROUND
          </p>
        </div>
        <span className="text-[9px] font-bold text-white/80 tracking-wider ml-3 flex-shrink-0">ABOUT</span>
      </div>
    </div>
  );
}
