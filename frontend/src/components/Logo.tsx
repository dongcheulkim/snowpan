interface LogoProps { withText?: boolean; className?: string; }

// SNOW PAN 워드마크 — 모든 글자를 SVG 패스로 그려 폰트 의존성 제거.
// "A"는 crossbar 없는 등변삼각형 (산 / 지평선 의미).
function SnowPanWordmark({ height = 22 }: { height?: number }) {
  return (
    <svg viewBox="0 0 540 100" height={height} aria-label="SNOW PAN" role="img" style={{ display: 'block' }}>
      <g fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="square" strokeLinejoin="miter">
        {/* SNOW */}
        {/* S */}
        <path d="M 47 18 Q 3 18 3 33 Q 3 50 25 50 Q 47 50 47 67 Q 47 82 3 82" />
        {/* N */}
        <path d="M 65 82 V 18 L 115 82 V 18" />
        {/* O */}
        <ellipse cx="155" cy="50" rx="25" ry="32" />
        {/* W */}
        <polyline points="195,18 207,82 220,32 233,82 245,18" />

        {/* PAN */}
        {/* P */}
        <path d="M 305 82 V 18 H 335 Q 355 18 355 35 Q 355 52 335 52 H 305" />
        {/* A — crossbar 없는 삼각형 */}
        <polyline points="370,82 395,18 420,82" />
        {/* N */}
        <path d="M 435 82 V 18 L 485 82 V 18" />
      </g>
    </svg>
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

export default function Logo({ withText = true, className = '' }: LogoProps) {
  void withText;
  return (
    <span className={`inline-flex items-center text-gray-900 select-none ${className}`}>
      <SnowPanWordmark height={20} />
    </span>
  );
}
