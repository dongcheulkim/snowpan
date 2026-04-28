interface LogoProps { withText?: boolean; className?: string; }

// SNOW PAN — Bold sans-serif + A 자리 두꺼운 삼각형.
// 브랜드북은 Helvetica Bold 급의 묵직한 wordmark. 삼각형도 같은 두께로 보이게 filled polygon.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  void withText;
  return (
    <span
      className={`inline-flex items-baseline text-gray-900 select-none ${className}`}
      style={{
        fontFamily: '"Helvetica Neue", Helvetica, "Inter", "Apple SD Gothic Neo", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '22px',
        letterSpacing: '0.08em',
        // 안전 padding — 일부 폰트 폴백에서 S 의 left bearing 이 음수가 되어 좌측 클립되는 문제 방지.
        paddingLeft: '2px',
      }}
    >
      SNOW&nbsp;P
      {/*
        A 삼각형 — crossbar 없이 두 대각선이 위에서 만나는 chevron.
        strokeWidth 를 fontSize 의 ~12% 로 잡아 letter stroke 와 시각적 일치.
      */}
      <svg
        viewBox="0 0 60 72"
        width="0.58em"
        height="0.7em"
        aria-hidden="true"
        style={{ display: 'inline-block', verticalAlign: 'baseline', marginLeft: '0.04em', marginRight: '0.04em' }}
      >
        <polyline
          points="6,68 30,6 54,68"
          fill="none"
          stroke="currentColor"
          strokeWidth="13"
          strokeLinecap="butt"
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
