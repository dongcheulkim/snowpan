interface LogoProps { withText?: boolean; className?: string; }

// SNOW PAN — 진짜 폰트(Inter Thin) 사용 + A 자리에 삼각형 SVG.
// 브랜드북의 elegant 한 mono-line sans-serif 톤 그대로.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  void withText;
  return (
    <span
      className={`inline-flex items-center text-gray-900 select-none ${className}`}
      style={{
        fontFamily: 'Inter, "Helvetica Neue", "Apple SD Gothic Neo", system-ui, sans-serif',
        fontWeight: 200,
        fontSize: '20px',
        letterSpacing: '0.18em',
      }}
    >
      SNOW&nbsp;P
      {/* A — crossbar 없는 삼각형. 폰트 비율에 맞춘 세로/가로 비. */}
      <svg
        viewBox="0 0 50 60"
        width="0.6em"
        height="0.7em"
        aria-hidden="true"
        style={{ display: 'inline-block', verticalAlign: '-0.05em', marginLeft: '0.05em', marginRight: '0.05em' }}
      >
        <polyline
          points="3,57 25,3 47,57"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
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
