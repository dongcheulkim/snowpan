// 브랜드 소개 슬라이드 — 광고 배너와 같은 비율의 컴팩트 버전. 홈 배너 rotator 첫 슬라이드.
// 판(vertical)별 브랜딩: snow 는 설원 사진 + SNOWPAN, 다른 판은 config 색·슬로건 기반.
import { useVertical } from '../hooks/useVertical';

// 'SNOW P∧N' 형태 워드마크 — prefix 만 판별로 교체 (RUN P∧N 등).
const PanMark = ({ prefix, className }: { prefix: string; className?: string }) => (
  <span
    className={`inline-flex items-baseline select-none ${className ?? ''}`}
    style={{
      fontFamily: '"Helvetica Neue", Helvetica, "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}
  >
    {prefix}&nbsp;P
    <svg viewBox="0 0 60 72" width="0.58em" height="0.7em" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'baseline', marginLeft: '0.04em', marginRight: '0.04em' }}>
      <polyline points="6,68 30,6 54,68" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
    N
  </span>
);

export default function BrandHero() {
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';

  if (isSnow) {
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
        {/* 좌측 → 가독성 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center px-5 sm:px-8">
          <div className="flex-1 text-white drop-shadow-sm">
            <PanMark prefix="SNOW" className="text-[18px] sm:text-[26px]" />
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

  // 다른 판 — config 색상 그라데이션 배경 + 판 슬로건 (전용 사진 생기면 교체).
  const prefix = vertical.name.replace(/PAN$/, ''); // 'RUN', 'BIKE', ...
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(120deg, ${vertical.accentColor} 0%, ${vertical.toneTo} 75%, ${vertical.toneFrom} 100%)` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex items-center px-5 sm:px-8">
        <div className="flex-1 text-white drop-shadow-sm">
          <PanMark prefix={prefix} className="text-[18px] sm:text-[26px]" />
          <p className="mt-1 text-[11px] sm:text-sm font-semibold leading-tight">
            {vertical.description}
          </p>
          {vertical.englishSlogan && (
            <p className="text-[9px] sm:text-[10px] tracking-[0.14em] font-medium mt-0.5 opacity-80">
              {vertical.englishSlogan}
            </p>
          )}
        </div>
        <span className="text-[9px] font-bold text-white/80 tracking-wider ml-3 flex-shrink-0">{vertical.tagline}</span>
      </div>
    </div>
  );
}
