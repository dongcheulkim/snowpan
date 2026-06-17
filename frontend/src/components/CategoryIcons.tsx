// 카테고리 아이콘 — 디테일 강화 벡터 (fill + stroke 혼합).
// 모노크롬 currentColor 톤은 유지, 형태만 더 사실적/구분 가능하게.
// viewBox 64×64 통일.

interface IconProps { size?: number; className?: string; }

const baseProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 64 64',
  fill: 'currentColor',
  xmlns: 'http://www.w3.org/2000/svg',
  className,
  'aria-hidden': true as const,
});

// 음각 디테일용 stroke 공통 속성 (배경 같은 색을 stroke 로 빼서 안쪽 라인 표현).
const inkLine = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// 1. 스키샵 — 건물 + 차양 + 쇼윈도 + 진열된 스키
export const SkiShopIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 건물 + 지붕 (한 덩어리) */}
    <path d="M6 26 L 32 10 L 58 26 L 58 32 L 54 32 L 54 56 L 10 56 L 10 32 L 6 32 Z" />
    {/* 차양 띠 (음각) */}
    <rect x="11" y="32" width="42" height="3" fill="#fff" />
    {/* 쇼윈도 외곽 */}
    <rect x="14" y="38" width="20" height="14" rx="1" fill="#fff" />
    {/* 쇼윈도 안 진열된 스키 (대각선 막대 2개) */}
    <path {...inkLine} d="M17 50 L 30 41 M 19 50 L 32 41" strokeWidth="1.6" />
    {/* 출입문 */}
    <rect x="38" y="38" width="12" height="18" fill="#fff" />
    <rect x="40" y="40" width="8" height="14" />
    {/* 손잡이 */}
    <circle cx="45.5" cy="48" r="0.9" fill="#fff" />
  </svg>
);

// 2. 정비 — 왁싱 다리미가 스키 베이스 위에서 작동 (스키 정비 특화)
// 일반 옷 다리미와 다른 점: 직사각형 본체 (옷 다리미는 코가 뾰족).
export const MaintenanceIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 손잡이 D자 고리 (다리미 위) */}
    <path d="M22 22 a 10 10 0 0 1 20 0" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* 본체 — 직사각형 (스키 왁싱 다리미 특징) */}
    <rect x="12" y="22" width="40" height="14" rx="1.5" />
    {/* 핫 플레이트 (본체 아래 두꺼운 띠) */}
    <rect x="10" y="35" width="44" height="5" rx="1.5" />
    {/* 온도 다이얼 (음각 동그라미) */}
    <circle cx="40" cy="29" r="2.5" fill="#fff" />
    <path d="M40 27.5 L 40 29" {...inkLine} stroke="#fff" strokeWidth="1.5" />
    {/* 스키 — 다리미 바로 아래 길쭉한 베이스 */}
    <path d="M2 44 L 60 44 L 60 50 L 4 50 Q 2 50 2 48 Z" />
    {/* 스키 팁 (오른쪽 살짝 위로 휨) */}
    <path d="M58 44 Q 62 41 62 38" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* 녹은 왁스 방울 — 다리미와 스키 사이 (음각 동그라미) */}
    <circle cx="20" cy="42" r="1.5" fill="#fff" />
    <circle cx="32" cy="42" r="1.5" fill="#fff" />
    {/* 열 표시 (다리미 본체 위쪽 작은 물결 2개) */}
    <path d="M16 8 q 2 3 0 6 M 26 8 q 2 3 0 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 3. 중고거래 — 순환 화살표 2개 (재사용/거래)
export const SecondHandIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 위쪽 화살표 (왼→오, 시계방향) */}
    <path d="M14 22 a 18 18 0 0 1 30 -7 L 49 12 L 49 24 L 37 24 L 41 19 a 13 13 0 0 0 -22 5 Z" />
    {/* 아래쪽 화살표 (오→왼, 시계방향) */}
    <path d="M50 42 a 18 18 0 0 1 -30 7 L 15 52 L 15 40 L 27 40 L 23 45 a 13 13 0 0 0 22 -5 Z" />
    {/* 중앙 코인 + ₩ */}
    <circle cx="32" cy="32" r="5.5" />
    <path d="M30 29 L 32 31.5 L 34 29 M 28.8 32.5 L 35.2 32.5 M 28.8 34 L 35.2 34" {...inkLine} stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// 4. 렌탈 — 스키부츠 (옆모습) + 매달린 가격표 (대여용 장비 명확)
export const RentalIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 부츠 본체 (옆모습 — 굵직하고 알아보기 쉬운 사이드뷰) */}
    <path d="M14 22 L 14 42 L 12 48 L 12 54 a 2 2 0 0 0 2 2 L 50 56 a 2 2 0 0 0 2 -2 L 52 48 L 44 42 L 42 36 L 42 22 Q 42 18 38 18 L 18 18 Q 14 18 14 22 Z" />
    {/* 부츠 음각 — 발등 라인 */}
    <path d="M14 30 L 42 30 M 14 36 L 42 36" {...inkLine} stroke="#fff" strokeWidth="2" />
    {/* 버클 3개 (음각 사각) */}
    <rect x="18" y="32" width="3" height="2" fill="#fff" />
    <rect x="25" y="32" width="3" height="2" fill="#fff" />
    <rect x="32" y="32" width="3" height="2" fill="#fff" />
    {/* 매달린 가격표 — 끈 */}
    <path d="M48 6 L 48 18" {...inkLine} strokeWidth="2.2" />
    {/* 가격표 본체 */}
    <path d="M42 6 L 56 6 L 60 12 L 56 18 L 42 18 Z" />
    {/* 가격표 구멍 */}
    <circle cx="48" cy="12" r="1.6" fill="#fff" />
    {/* ₩ (가격표 글자) */}
    <path d="M51 11 L 53 13 L 55 11 M 50.5 14 L 55.5 14" {...inkLine} stroke="#fff" strokeWidth="1.3" />
  </svg>
);

// 5. 레슨 — 다이내믹 스키어 + 눈가루
export const LessonIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 머리 */}
    <circle cx="44" cy="12" r="5" />
    {/* 헬멧 라인 */}
    <path d="M39 12 a 5 5 0 0 1 10 0" {...inkLine} stroke="#fff" strokeWidth="1.5" />
    {/* 몸통 (앞 숙임) */}
    <path d="M40 19 C 35 19 31 23 30 28 L 26 38 C 25 40 26 43 28 44 L 38 47 C 41 48 44 47 45 44 L 51 30 C 52 27 50 24 47 23 L 43 20 C 42 19 41 19 40 19 Z" />
    {/* 팔 (앞으로 뻗음) */}
    <path d="M48 28 L 56 24 L 58 27 L 50 32 Z" />
    {/* 다리 (뒤로) */}
    <path d="M28 42 L 14 52 C 13 53 13 55 15 56 L 17 57 C 18 58 20 58 21 57 L 33 47 Z" />
    {/* 스키 1 */}
    <path d="M4 53 L 60 53 L 60 56 L 4 56 Z" />
    {/* 스키 2 (살짝 위) */}
    <path d="M6 48 L 32 48 L 32 51 L 6 51 Z" />
    {/* 폴 */}
    <path d="M50 24 L 53 22 L 60 48 L 57 50 Z" />
    {/* 눈가루 (뒤쪽 스플래시) */}
    <circle cx="8" cy="44" r="1.5" />
    <circle cx="12" cy="40" r="1.2" />
    <circle cx="16" cy="46" r="1" />
  </svg>
);

// 6. 숙소 — 산장 (눈 쌓인 지붕 + 굴뚝 연기 + 따뜻한 창문)
export const AccommodationIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 본체 */}
    <rect x="10" y="30" width="44" height="26" />
    {/* 박공지붕 */}
    <path d="M6 32 L 32 10 L 58 32 Z" />
    {/* 지붕 위 눈 (음각 라인) */}
    <path d="M11 28 Q 20 25 32 13 Q 44 25 53 28" {...inkLine} stroke="#fff" strokeWidth="2.5" />
    {/* 굴뚝 */}
    <rect x="44" y="16" width="6" height="12" />
    {/* 연기 (작은 동글) */}
    <circle cx="47" cy="12" r="2" />
    <circle cx="51" cy="8" r="1.5" />
    {/* 따뜻한 창 1 (음각) */}
    <rect x="16" y="36" width="8" height="8" fill="#fff" />
    <path d="M20 36 L 20 44 M 16 40 L 24 40" {...inkLine} strokeWidth="1.4" />
    {/* 따뜻한 창 2 (음각) */}
    <rect x="40" y="36" width="8" height="8" fill="#fff" />
    <path d="M44 36 L 44 44 M 40 40 L 48 40" {...inkLine} strokeWidth="1.4" />
    {/* 문 (음각) */}
    <path d="M28 56 L 28 44 a 4 4 0 0 1 8 0 L 36 56 Z" fill="#fff" />
    <circle cx="34" cy="50" r="1" />
  </svg>
);

// 7. 커뮤니티 — 겹친 말풍선 2개
export const CommunityIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 뒷 말풍선 (작음, 오른쪽 위) */}
    <path d="M30 6 L 56 6 a 4 4 0 0 1 4 4 L 60 26 a 4 4 0 0 1 -4 4 L 52 30 L 52 36 L 46 30 L 34 30 a 4 4 0 0 1 -4 -4 Z" />
    {/* 앞 말풍선 (큼, 왼쪽 아래) */}
    <path d="M4 24 a 4 4 0 0 1 4 -4 L 36 20 a 4 4 0 0 1 4 4 L 40 46 a 4 4 0 0 1 -4 4 L 22 50 L 14 58 L 14 50 L 8 50 a 4 4 0 0 1 -4 -4 Z" />
    {/* 앞 말풍선 안 점 3개 (음각) */}
    <circle cx="14" cy="35" r="2" fill="#fff" />
    <circle cx="22" cy="35" r="2" fill="#fff" />
    <circle cx="30" cy="35" r="2" fill="#fff" />
  </svg>
);

// 8. 시합일정 — 캘린더 + 트로피 마크
export const ScheduleIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 캘린더 본체 */}
    <rect x="6" y="12" width="52" height="46" rx="4" />
    {/* 상단 띠 (음각) */}
    <rect x="6" y="18" width="52" height="6" fill="#fff" />
    {/* 위쪽 고리 */}
    <rect x="16" y="6" width="4" height="12" rx="2" />
    <rect x="44" y="6" width="4" height="12" rx="2" />
    {/* 날짜 칸 음각 — 3x4 그리드 */}
    <g fill="#fff">
      <rect x="11" y="28" width="8" height="6" />
      <rect x="22" y="28" width="8" height="6" />
      <rect x="33" y="28" width="8" height="6" />
      <rect x="44" y="28" width="8" height="6" />
      <rect x="11" y="38" width="8" height="6" />
      <rect x="22" y="38" width="8" height="6" />
      {/* 강조된 시합 날 (음각 제거 → solid 채움) */}
      <rect x="11" y="48" width="8" height="6" />
      <rect x="22" y="48" width="8" height="6" />
    </g>
    {/* 강조 날 위에 별 (트로피 대신 작은 상징) */}
    <path d="M37 39 L 38.2 42.3 L 41.6 42.3 L 38.8 44.4 L 39.9 47.7 L 37 45.6 L 34.1 47.7 L 35.2 44.4 L 32.4 42.3 L 35.8 42.3 Z" />
    <path d="M48 39 L 49.2 42.3 L 52.6 42.3 L 49.8 44.4 L 50.9 47.7 L 48 45.6 L 45.1 47.7 L 46.2 44.4 L 43.4 42.3 L 46.8 42.3 Z" />
  </svg>
);

// 9. 실시간웹캠 — 카메라 + 송출 시그널
export const LivecamIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 카메라 본체 */}
    <path d="M8 22 a 4 4 0 0 0 -4 4 L 4 44 a 4 4 0 0 0 4 4 L 38 48 a 4 4 0 0 0 4 -4 L 42 26 a 4 4 0 0 0 -4 -4 Z" />
    {/* 렌즈 */}
    <circle cx="23" cy="35" r="8" fill="#fff" />
    <circle cx="23" cy="35" r="5" />
    {/* 작은 LED */}
    <circle cx="36" cy="28" r="1.5" fill="#fff" />
    {/* 뷰파인더 (오른쪽 튀어나옴) */}
    <path d="M46 30 L 56 22 a 1 1 0 0 1 1.7 0.7 L 57.7 47.3 a 1 1 0 0 1 -1.7 0.7 L 46 40 Z" />
    {/* 송출 시그널 호 (음각) */}
    <path d="M50 12 a 12 12 0 0 1 4 8" {...inkLine} strokeWidth="2.5" />
    <path d="M54 8 a 18 18 0 0 1 6 12" {...inkLine} strokeWidth="2.5" />
    {/* LIVE 도트 */}
    <circle cx="14" cy="28" r="2" fill="#fff" />
  </svg>
);

// 10. 쿠폰샵 — 디테일 강화 티켓 (별 + 점선)
export const CouponIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 티켓 본체 (양쪽 노치) */}
    <path d="M6 18 a 4 4 0 0 1 4 -4 L 54 14 a 4 4 0 0 1 4 4 L 58 24 a 4 4 0 0 0 0 8 L 58 38 a 4 4 0 0 1 -4 4 L 10 42 a 4 4 0 0 1 -4 -4 L 6 32 a 4 4 0 0 0 0 -8 Z" />
    {/* 중앙 점선 (음각) — 절취선 */}
    <path d="M32 18 L 32 22 M 32 26 L 32 30 M 32 34 L 32 38" {...inkLine} stroke="#fff" strokeWidth="2.2" />
    {/* 왼쪽 별 */}
    <path d="M18 23 L 19.7 27.1 L 24 27.1 L 20.6 29.6 L 21.9 33.8 L 18 31.3 L 14.1 33.8 L 15.4 29.6 L 12 27.1 L 16.3 27.1 Z" fill="#fff" />
    {/* 오른쪽 % */}
    <circle cx="42" cy="24" r="2.5" fill="#fff" />
    <circle cx="50" cy="34" r="2.5" fill="#fff" />
    <path d="M40 36 L 52 22" {...inkLine} stroke="#fff" strokeWidth="2.5" />
  </svg>
);

// 11. 스노우런 — 번개 + 속도선
export const SnowRunIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 번개 */}
    <path d="M40 4 L 14 34 L 28 34 L 22 60 L 50 30 L 36 30 Z" />
    {/* 속도선 (오른쪽 잔상) */}
    <path d="M52 10 L 60 10 M 50 18 L 58 18 M 54 26 L 62 26" {...inkLine} strokeWidth="2.5" />
  </svg>
);

export const categoryIcons = {
  skishop: SkiShopIcon,
  repair: MaintenanceIcon,
  used: SecondHandIcon,
  rental: RentalIcon,
  lesson: LessonIcon,
  accommodation: AccommodationIcon,
  community: CommunityIcon,
  competitions: ScheduleIcon,
  webcam: LivecamIcon,
  coupon: CouponIcon,
  snowrun: SnowRunIcon,
};
