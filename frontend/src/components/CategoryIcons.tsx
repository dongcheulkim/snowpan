// 카테고리 아이콘 9종 — 전부 solid fill silhouette 으로 통일.
// 브랜드북의 모노크롬 한 벌 톤. stroke 기반이나 혼합(stroke+fill) 없음.
// fill="currentColor" 라 부모의 text-* 색상을 따라감.
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

// 1. 스키샵 — 박공지붕 + 본체 + 출입구 (기존)
export const SkiShopIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M6 22 L32 8 L58 22 L58 28 L52 28 L52 54 L38 54 L38 38 L26 38 L26 54 L12 54 L12 28 L6 28 Z" />
  </svg>
);

// 2. 정비 — 렌치 (기존)
export const MaintenanceIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M44 6 a 14 14 0 0 0 -14 14 c 0 2 0.4 4 1 5.7 L8 47.7 a 4 4 0 0 0 0 5.7 l 2.6 2.6 a 4 4 0 0 0 5.7 0 L 38.3 33 c 1.7 0.6 3.7 1 5.7 1 a 14 14 0 0 0 14 -14 c 0 -2 -0.4 -4 -1.1 -5.8 L 49 22.1 a 4 4 0 0 1 -5.7 0 l -1.4 -1.4 a 4 4 0 0 1 0 -5.7 L 49.8 7 C 48 6.4 46 6 44 6 Z" />
  </svg>
);

// 3. 중고거래 — 가격 태그 (기존)
export const SecondHandIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M30 6 L 56 6 L 56 32 L 32 56 a 4 4 0 0 1 -5.7 0 L 6 35.7 a 4 4 0 0 1 0 -5.7 L 30 6 Z M 47 13 a 4 4 0 1 0 0 8 a 4 4 0 0 0 0 -8 Z" fillRule="evenodd" />
  </svg>
);

// 4. 렌탈 — 크로스 스키 (solid fill 로 재작성)
export const RentalIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path fillRule="evenodd" d="M11.6 8.8 L 18.4 2 L 62 45.6 L 55.2 52.4 Z M 2 45.6 L 45.6 2 L 52.4 8.8 L 8.8 52.4 Z M 10 56 a 4 4 0 1 0 0 8 a 4 4 0 0 0 0 -8 Z M 54 56 a 4 4 0 1 0 0 8 a 4 4 0 0 0 0 -8 Z" />
  </svg>
);

// 5. 레슨 — 스키타는 사람 (solid silhouette 으로 재작성)
export const LessonIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    {/* 머리 */}
    <circle cx="42" cy="10" r="5" />
    {/* 몸통 (앞으로 숙인 자세) */}
    <path d="M38 18 C 34 18 31 21 30 25 L 25 36 C 24 38 25 41 27 42 L 37 46 C 39 47 42 46 43 44 L 50 30 C 51 28 50 25 48 24 L 42 19 C 41 18 40 18 38 18 Z" />
    {/* 다리 (뒤로 차는) */}
    <path d="M27 40 L 15 52 C 14 53 14 55 15 56 L 16 57 C 17 58 19 58 20 57 L 34 44 Z" />
    {/* 스키 (긴 실루엣) */}
    <path d="M6 52 L 58 52 L 58 56 L 6 56 Z" />
    {/* 폴 (손에서 아래로) */}
    <path d="M48 26 L 51 24 L 58 50 L 55 52 Z" />
  </svg>
);

// 6. 숙소 — 박공지붕 집 + 굴뚝 (기존)
export const AccommodationIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M32 8 L 8 28 L 8 56 L 24 56 L 24 40 L 40 40 L 40 56 L 56 56 L 56 28 Z M 44 12 L 50 12 L 50 22 L 44 18 Z" />
  </svg>
);

// 7. 커뮤니티 — 말풍선 (solid, 안쪽 점 3개도 solid 처리)
export const CommunityIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path
      fillRule="evenodd"
      d="M8 10 a 4 4 0 0 1 4 -4 L 52 6 a 4 4 0 0 1 4 4 L 56 38 a 4 4 0 0 1 -4 4 L 28 42 L 18 54 a 1 1 0 0 1 -2 -1 L 16 42 L 12 42 a 4 4 0 0 1 -4 -4 Z M 22 27 a 3 3 0 1 0 0 -6 a 3 3 0 0 0 0 6 Z M 32 27 a 3 3 0 1 0 0 -6 a 3 3 0 0 0 0 6 Z M 42 27 a 3 3 0 1 0 0 -6 a 3 3 0 0 0 0 6 Z"
    />
  </svg>
);

// 8. 시합일정 — 캘린더 (solid outline with subtracted cells via evenodd)
export const ScheduleIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path
      fillRule="evenodd"
      d="M18 6 a 2 2 0 0 1 2 -2 a 2 2 0 0 1 2 2 L 22 10 L 42 10 L 42 6 a 2 2 0 0 1 2 -2 a 2 2 0 0 1 2 2 L 46 10 L 52 10 a 6 6 0 0 1 6 6 L 58 54 a 4 4 0 0 1 -4 4 L 10 58 a 4 4 0 0 1 -4 -4 L 6 16 a 6 6 0 0 1 6 -6 L 18 10 Z M 12 28 L 12 34 L 20 34 L 20 28 Z M 24 28 L 24 34 L 32 34 L 32 28 Z M 36 28 L 36 34 L 44 34 L 44 28 Z M 48 28 L 48 34 L 56 34 L 56 28 Z M 12 40 L 12 46 L 20 46 L 20 40 Z M 24 40 L 24 46 L 32 46 L 32 40 Z M 36 40 L 36 46 L 44 46 L 44 40 Z M 48 40 L 48 46 L 56 46 L 56 40 Z"
    />
  </svg>
);

// 9. 실시간캠 — 비디오카메라 (기존, 이미 solid)
export const LivecamIcon = ({ size = 32, className }: IconProps) => (
  <svg {...baseProps(size, className)}>
    <path d="M10 20 a 4 4 0 0 0 -4 4 L 6 40 a 4 4 0 0 0 4 4 L 40 44 a 4 4 0 0 0 4 -4 L 44 24 a 4 4 0 0 0 -4 -4 Z M 48 26 L 58 18 a 1 1 0 0 1 1.7 0.7 L 59.7 45.3 a 1 1 0 0 1 -1.7 0.7 L 48 38 Z" />
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
};
