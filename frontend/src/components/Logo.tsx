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

