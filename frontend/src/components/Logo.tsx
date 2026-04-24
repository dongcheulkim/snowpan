interface LogoProps { withText?: boolean; className?: string; }

// SNOW PAN — Inter Thin (100) + A 자리 삼각형 SVG.
// 브랜드북의 ultra-thin monoline 톤 최대한 맞춤.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  void withText;
  return (
    <span
      className={`inline-flex items-center text-gray-900 select-none ${className}`}
      style={{
        fontFamily: '"Inter", "Helvetica Neue", "HelveticaNeue-UltraLight", "Apple SD Gothic Neo", system-ui, sans-serif',
        fontWeight: 100,
        fontSize: '22px',
        letterSpacing: '0.2em',
      }}
    >
      SNOW&nbsp;P
      {/*
        A 삼각형 — 폰트 A 글자와 비슷한 비율.
        A 글자 aspect: 높이 ≈ fontSize × 0.72, 폭 ≈ fontSize × 0.67
        stroke-width 는 Inter Thin 100 의 수직 stroke 두께에 맞춰 얇게.
      */}
      <svg
        viewBox="0 0 70 80"
        width="0.67em"
        height="0.78em"
        aria-hidden="true"
        style={{ display: 'inline-block', verticalAlign: '-0.04em', marginLeft: '0.06em', marginRight: '0.06em' }}
      >
        <polyline
          points="3,77 35,3 67,77"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      N
    </span>
  );
}

// 6점 눈송이 아이콘 (브랜드북 ICON 영역)
export function Snowflake({ size = 24 }: { size?: number }) {
  const arm = (
    <g>
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="32" y1="14" x2="27" y2="19" />
      <line x1="32" y1="14" x2="37" y2="19" />
      <line x1="32" y1="50" x2="27" y2="45" />
      <line x1="32" y1="50" x2="37" y2="45" />
    </g>
  );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        {arm}
        <g transform="rotate(60 32 32)">{arm}</g>
        <g transform="rotate(120 32 32)">{arm}</g>
      </g>
    </svg>
  );
}
