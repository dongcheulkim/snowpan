import { useVertical } from '../hooks/useVertical';

interface LogoProps { withText?: boolean; className?: string; }

// 워드마크 — vertical-aware. snow=SNOWPAN, 다른 vertical=텍스트 워드마크 동적 생성.
// 향후 vertical 별 공식 AI 워드마크 추가 시 SVG 자산으로 교체.

export default function Logo({ withText = true, className = '' }: LogoProps) {
  const vertical = useVertical();

  // snow vertical 은 공식 SNOWPAN AI SVG 사용
  if (vertical.slug === 'snow') {
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

  // 다른 vertical — 텍스트 워드마크. chevron-A 처리한 SVG inline.
  // 'BIKEPAN' → 'BIKE P∧N' 형태로 분리
  const name = vertical.name; // 'BIKEPAN', 'RUNPAN', etc.
  const prefix = name.replace(/PAN$/, ''); // 'BIKE', 'RUN', ...
  return (
    <span
      className={`inline-flex items-baseline select-none text-gray-900 ${className}`}
      style={{
        fontFamily: '"Helvetica Neue", Helvetica, "Inter", sans-serif',
        fontWeight: 800,
        letterSpacing: '0.08em',
        fontSize: '20px',
      }}
    >
      {prefix}&nbsp;P
      <svg viewBox="0 0 60 72" width="0.58em" height="0.7em" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'baseline', marginLeft: '0.04em', marginRight: '0.04em' }}>
        <polyline points="6,68 30,6 54,68" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="butt" strokeLinejoin="miter" />
      </svg>
      N
    </span>
  );
}

// 6점 눈송이 아이콘 — snow vertical 전용 ICON 영역.
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
