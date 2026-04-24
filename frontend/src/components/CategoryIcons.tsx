// 카테고리 아이콘 모음 — 브랜드북 카테고리 아이콘과 동일한 톤 (검정 실루엣).
// fill="currentColor" 라 부모의 text-* 색상을 따라감 (다크모드/회색 비활성 등 자유)
// viewBox 64×64 통일, props 로 size 만 받음.

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

// 1. 스키샵 — 박공지붕 + 본체 + 출입구
export const SkiShopIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M6 22 L32 8 L58 22 L58 28 L52 28 L52 54 L38 54 L38 38 L26 38 L26 54 L12 54 L12 28 L6 28 Z" />
  </svg>
);

// 2. 정비 — 렌치
export const MaintenanceIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M44 6 a 14 14 0 0 0 -14 14 c 0 2 0.4 4 1 5.7 L8 47.7 a 4 4 0 0 0 0 5.7 l 2.6 2.6 a 4 4 0 0 0 5.7 0 L 38.3 33 c 1.7 0.6 3.7 1 5.7 1 a 14 14 0 0 0 14 -14 c 0 -2 -0.4 -4 -1.1 -5.8 L 49 22.1 a 4 4 0 0 1 -5.7 0 l -1.4 -1.4 a 4 4 0 0 1 0 -5.7 L 49.8 7 C 48 6.4 46 6 44 6 Z" />
  </svg>
);

// 3. 중고거래 — 가격 태그
export const SecondHandIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M30 6 L 56 6 L 56 32 L 32 56 a 4 4 0 0 1 -5.7 0 L 6 35.7 a 4 4 0 0 1 0 -5.7 L 30 6 Z M 47 13 a 4 4 0 1 0 0 8 a 4 4 0 0 0 0 -8 Z" fillRule="evenodd" />
  </svg>
);

// 4. 렌탈 — 크로스 스키
export const RentalIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 스키 1 (좌상→우하 대각선) */}
    <rect x="6" y="28" width="52" height="8" rx="4" transform="rotate(45 32 32)" />
    {/* 스키 2 (우상→좌하 대각선) */}
    <rect x="6" y="28" width="52" height="8" rx="4" transform="rotate(-45 32 32)" />
    {/* 양 끝 부츠/팁 */}
    <circle cx="14" cy="14" r="6" />
    <circle cx="50" cy="14" r="6" />
  </svg>
);

// 5. 레슨 — 스키타는 사람 실루엣
export const LessonIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 머리 */}
    <circle cx="42" cy="14" r="5" />
    {/* 몸통 (앞으로 숙인) */}
    <path d="M44 22 c -3 0 -6 2 -7 5 l -4 8 c -1 2 0 4 2 5 l 8 3 c 2 1 4 0 5 -2 l 5 -10 c 1 -2 0 -5 -2 -6 L 46 23 c -1 -1 -1 -1 -2 -1 Z" />
    {/* 다리 */}
    <path d="M30 35 l -8 14 c -1 2 1 4 3 4 c 1 0 2 0 3 -1 l 8 -10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
    {/* 스키 */}
    <rect x="8" y="50" width="44" height="5" rx="2.5" />
    {/* 폴 */}
    <line x1="48" y1="28" x2="56" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// 6. 숙소 — 박공지붕 집 + 굴뚝
export const AccommodationIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M32 8 L 8 28 L 8 56 L 24 56 L 24 40 L 40 40 L 40 56 L 56 56 L 56 28 Z M 44 12 L 50 12 L 50 22 L 44 18 Z" />
  </svg>
);

// 7. 커뮤니티 — 말풍선 + 점 3개
export const CommunityIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M8 10 a 4 4 0 0 1 4 -4 L 52 6 a 4 4 0 0 1 4 4 L 56 38 a 4 4 0 0 1 -4 4 L 28 42 L 18 54 a 1 1 0 0 1 -2 -1 L 16 42 L 12 42 a 4 4 0 0 1 -4 -4 Z" />
    <circle cx="22" cy="24" r="3" fill="white" />
    <circle cx="32" cy="24" r="3" fill="white" />
    <circle cx="42" cy="24" r="3" fill="white" />
  </svg>
);

// 8. 시합일정 — 캘린더 (상단 바 + 4칸)
export const ScheduleIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M10 12 L 54 12 a 4 4 0 0 1 4 4 L 58 22 L 6 22 L 6 16 a 4 4 0 0 1 4 -4 Z M 6 26 L 58 26 L 58 52 a 4 4 0 0 1 -4 4 L 10 56 a 4 4 0 0 1 -4 -4 Z" />
    <rect x="14" y="6" width="4" height="10" rx="2" />
    <rect x="46" y="6" width="4" height="10" rx="2" />
    {/* 4 days */}
    <rect x="14" y="32" width="10" height="8" rx="1" fill="white" />
    <rect x="28" y="32" width="10" height="8" rx="1" fill="white" />
    <rect x="14" y="44" width="10" height="8" rx="1" fill="white" />
    <rect x="28" y="44" width="10" height="8" rx="1" fill="white" />
    <rect x="42" y="32" width="10" height="8" rx="1" fill="white" />
  </svg>
);

// 9. 실시간캠 — 비디오카메라
export const LivecamIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <rect x="6" y="20" width="38" height="24" rx="4" />
    <path d="M44 26 L 58 18 L 58 46 L 44 38 Z" />
  </svg>
);

// 매핑 (Home.tsx 에서 id 로 lookup)
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
};
