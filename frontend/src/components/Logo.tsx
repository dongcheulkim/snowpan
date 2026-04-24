interface LogoProps { withText?: boolean; className?: string; }

// PAN 워드마크 — A 글자를 산모양 삼각형으로 대체.
// (브랜드 컨셉: 무한대 + 지평선 + 커뮤니티)
function PanMark({ height = 28 }: { height?: number }) {
  // viewBox 360x100 비율, currentColor 로 색상 상속
  return (
    <svg viewBox="0 0 360 100" height={height} aria-label="PAN" role="img" style={{ display: 'block' }}>
      <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter">
        {/* P */}
        <path d="M 25 95 V 10 H 65 Q 95 10 95 32 Q 95 54 65 54 H 25" />
        {/* A — crossbar 없는 삼각형 */}
        <polyline points="125,95 170,10 215,95" />
        {/* N */}
        <path d="M 250 95 V 10 L 330 95 V 10" />
      </g>
    </svg>
  );
}

export default function Logo({ withText = true, className = '' }: LogoProps) {
  // withText 는 호환성을 위해 유지 (기본 레이아웃에서 모두 wordmark 표시)
  void withText;
  return (
    <span className={`inline-flex items-center text-gray-900 select-none ${className}`}>
      <PanMark height={26} />
    </span>
  );
}
