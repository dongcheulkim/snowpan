interface LogoProps { withText?: boolean; className?: string; }

// SNOW PAN — 공식 AI 워드마크 (PDF→SVG 변환).
// 이미지 자산을 그대로 사용하여 브랜드북과 1:1 일치.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  const src = withText ? '/snowpan-wordmark.svg' : '/pan-wordmark.svg';
  const alt = withText ? 'SNOW PAN' : 'PAN';
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`select-none ${className}`}
      style={{ height: '22px', width: 'auto', display: 'inline-block' }}
    />
  );
}

// 6점 눈송이 아이콘 (브랜드북 ICON 영역) — 비-워드마크 자리에서 사용.
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
