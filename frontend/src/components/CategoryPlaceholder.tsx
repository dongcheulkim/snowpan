// 매물 사진이 없을 때 카테고리별 일러스트로 빈 회색 박스 대체.
// 실제 사진이 들어오기 전까지 첫인상을 부드럽게 — 라인 스타일 + 톤별 그라데이션.

interface Props {
  subcategory?: string | null;
  className?: string;
}

const TONE: Record<string, { from: string; to: string; ink: string }> = {
  ski:         { from: '#e0f2fe', to: '#bae6fd', ink: '#0369a1' },
  board:       { from: '#fce7f3', to: '#fbcfe8', ink: '#be185d' },
  boots:       { from: '#fef3c7', to: '#fde68a', ink: '#b45309' }, // 레거시 (스키부츠/보드부츠 분리 전)
  ski_boots:   { from: '#fef3c7', to: '#fde68a', ink: '#b45309' },
  board_boots: { from: '#fef0d9', to: '#fed7aa', ink: '#9a3412' },
  binding:     { from: '#e9d5ff', to: '#d8b4fe', ink: '#6b21a8' },
  wear:        { from: '#ffe4e6', to: '#fecdd3', ink: '#be123c' },
  pole:        { from: '#e2e8f0', to: '#cbd5e1', ink: '#334155' },
  helmet:      { from: '#dcfce7', to: '#bbf7d0', ink: '#15803d' },
  goggles:     { from: '#cffafe', to: '#a5f3fc', ink: '#0e7490' },
  gloves:      { from: '#ede9fe', to: '#ddd6fe', ink: '#5b21b6' },
  bag:         { from: '#dbeafe', to: '#bfdbfe', ink: '#1e40af' },
  accessory:   { from: '#fef3c7', to: '#fce7f3', ink: '#7c3aed' },
  etc:         { from: '#f1f5f9', to: '#e2e8f0', ink: '#475569' },
};

function Illustration({ subcategory, ink }: { subcategory: string; ink: string }) {
  const stroke = ink;
  const sw = 4.5;
  const common = { fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  // 신규/구분 카테고리를 기존 일러스트에 매핑.
  const key = subcategory === 'ski_boots' || subcategory === 'board_boots' ? 'boots' : subcategory;
  switch (key) {
    case 'ski':
      return (
        <g {...common}>
          {/* 두 개의 스키 — 살짝 X 자 */}
          <path d="M50 30 L78 130 M82 30 L54 130" />
          <path d="M50 30 Q52 22 54 30" />
          <path d="M82 30 Q80 22 78 30" />
          {/* 폴 두 개 (오른쪽 뒤) */}
          <path d="M95 40 L110 120" strokeWidth={sw - 1} />
          <circle cx="110" cy="125" r="5" fill={stroke} stroke="none" />
        </g>
      );
    case 'board':
      return (
        <g {...common}>
          {/* 보드 길게 비스듬히 */}
          <path d="M40 105 Q35 70 50 45 Q60 28 75 30 Q90 32 95 60 Q98 95 95 110 Q92 125 75 125 Q55 122 40 105 Z" />
          {/* 바인딩 두 개 */}
          <rect x="58" y="55" width="28" height="14" rx="3" />
          <rect x="56" y="100" width="32" height="14" rx="3" />
        </g>
      );
    case 'boots':
      return (
        <g {...common}>
          {/* 사이드뷰 부츠 — sole + cuff */}
          <path d="M40 90 L40 50 Q40 38 55 38 L85 38 Q98 38 100 52 L102 80 Q105 92 110 95 L110 110 L40 110 Z" />
          {/* 버클 라인 */}
          <line x1="50" y1="58" x2="98" y2="58" />
          <line x1="50" y1="72" x2="100" y2="72" />
          <line x1="50" y1="85" x2="102" y2="85" />
        </g>
      );
    case 'binding':
      return (
        <g {...common}>
          {/* 탑뷰 바인딩 */}
          <rect x="35" y="50" width="80" height="50" rx="10" />
          <circle cx="75" cy="75" r="14" />
          <line x1="75" y1="50" x2="75" y2="61" />
          <line x1="75" y1="89" x2="75" y2="100" />
          {/* 스트랩 */}
          <path d="M40 70 L30 65 M40 80 L30 85" />
          <path d="M110 70 L120 65 M110 80 L120 85" />
        </g>
      );
    case 'helmet':
      return (
        <g {...common}>
          {/* 헬멧 측면 */}
          <path d="M30 90 Q30 45 75 40 Q120 45 120 90 L100 95 Q75 92 50 95 Z" />
          {/* 통풍구 */}
          <line x1="50" y1="60" x2="60" y2="60" />
          <line x1="70" y1="55" x2="80" y2="55" />
          <line x1="90" y1="60" x2="100" y2="60" />
          {/* 끈 */}
          <path d="M40 90 L42 110 M110 90 L108 110" strokeWidth={sw - 1.5} />
        </g>
      );
    case 'goggles':
      return (
        <g {...common}>
          {/* 고글 정면 */}
          <path d="M30 75 Q30 55 50 50 L100 50 Q120 55 120 75 Q120 95 100 95 Q90 95 85 88 Q75 82 65 88 Q60 95 50 95 Q30 95 30 75 Z" />
          {/* 렌즈 */}
          <ellipse cx="55" cy="73" rx="14" ry="10" />
          <ellipse cx="95" cy="73" rx="14" ry="10" />
          {/* 스트랩 */}
          <path d="M30 70 L18 65 M120 70 L132 65" strokeWidth={sw - 1} />
        </g>
      );
    case 'wear':
      return (
        <g {...common}>
          {/* 자켓 실루엣 */}
          <path d="M45 50 L30 65 L40 90 L45 90 L45 125 L105 125 L105 90 L110 90 L120 65 L105 50 L92 45 Q75 55 58 45 Z" />
          {/* 지퍼 */}
          <line x1="75" y1="55" x2="75" y2="120" strokeWidth={sw - 1} />
          {/* 칼라 */}
          <path d="M58 45 Q75 60 92 45" strokeWidth={sw - 1} />
        </g>
      );
    case 'pole':
      return (
        <g {...common}>
          {/* 두 개의 폴이 X 자로 살짝 교차 */}
          <path d="M50 30 L100 125" />
          <path d="M100 30 L50 125" />
          {/* 위쪽 손잡이 (스트랩 고리) */}
          <path d="M50 30 L46 22 L54 22 Z" fill={stroke} stroke="none" />
          <path d="M100 30 L96 22 L104 22 Z" fill={stroke} stroke="none" />
          {/* 아래쪽 바스켓 (눈에 빠지지 않게 하는 원형) */}
          <circle cx="100" cy="125" r="7" fill={stroke} stroke="none" />
          <circle cx="50" cy="125" r="7" fill={stroke} stroke="none" />
        </g>
      );
    case 'gloves':
      return (
        <g {...common}>
          {/* 손모양 미튼 */}
          <path d="M55 60 Q55 38 75 38 Q95 38 95 60 L100 80 Q102 100 95 115 L55 115 Q48 100 50 80 Z" />
          {/* 엄지 */}
          <path d="M95 75 Q108 78 105 95" />
          {/* 손목 밴드 */}
          <line x1="55" y1="115" x2="95" y2="115" strokeWidth={sw + 1} />
          <line x1="55" y1="120" x2="95" y2="120" />
        </g>
      );
    case 'bag':
      return (
        <g {...common}>
          {/* 배낭 본체 */}
          <path d="M45 60 Q45 50 55 50 L95 50 Q105 50 105 60 L110 120 Q110 130 100 130 L50 130 Q40 130 40 120 Z" />
          {/* 손잡이 */}
          <path d="M60 50 Q60 35 75 35 Q90 35 90 50" strokeWidth={sw - 1} />
          {/* 앞주머니 */}
          <rect x="58" y="80" width="34" height="28" rx="3" />
          {/* 어깨끈 (위쪽) */}
          <line x1="48" y1="60" x2="40" y2="55" />
          <line x1="102" y1="60" x2="110" y2="55" />
        </g>
      );
    case 'accessory':
      return (
        <g {...common}>
          {/* 네크워머 + 워치 같은 작은 잡화 모음 */}
          {/* 네크워머 (원형 튜브) */}
          <ellipse cx="75" cy="55" rx="22" ry="10" />
          <path d="M53 55 L53 75 Q53 82 75 82 Q97 82 97 75 L97 55" />
          {/* 손목시계 */}
          <rect x="55" y="95" width="40" height="22" rx="4" />
          <line x1="55" y1="100" x2="40" y2="100" strokeWidth={sw - 1.5} />
          <line x1="55" y1="112" x2="40" y2="112" strokeWidth={sw - 1.5} />
          <line x1="95" y1="100" x2="110" y2="100" strokeWidth={sw - 1.5} />
          <line x1="95" y1="112" x2="110" y2="112" strokeWidth={sw - 1.5} />
          <circle cx="75" cy="106" r="3" fill={stroke} stroke="none" />
        </g>
      );
    case 'etc':
    default:
      return (
        <g {...common}>
          {/* 6점 눈송이 */}
          <g transform="translate(75 75)">
            {[0, 60, 120].map(angle => (
              <g key={angle} transform={`rotate(${angle})`}>
                <line x1="0" y1="-35" x2="0" y2="35" />
                <line x1="0" y1="-25" x2="-7" y2="-32" />
                <line x1="0" y1="-25" x2="7" y2="-32" />
                <line x1="0" y1="25" x2="-7" y2="32" />
                <line x1="0" y1="25" x2="7" y2="32" />
              </g>
            ))}
          </g>
        </g>
      );
  }
}

export default function CategoryPlaceholder({ subcategory, className = '' }: Props) {
  const sub = subcategory || 'etc';
  const tone = TONE[sub] || TONE.etc;
  const id = `ph-grad-${sub}`;
  return (
    <svg
      viewBox="0 0 150 150"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      role="img"
      aria-label={`${sub} placeholder`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone.from} />
          <stop offset="100%" stopColor={tone.to} />
        </linearGradient>
      </defs>
      <rect width="150" height="150" fill={`url(#${id})`} />
      <Illustration subcategory={sub} ink={tone.ink} />
    </svg>
  );
}
