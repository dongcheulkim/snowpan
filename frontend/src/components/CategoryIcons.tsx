// 카테고리 아이콘 — 솔리드(선+채움) 세트. currentColor, 24 viewBox, stroke-width 2.
// files-2 세트: 몸통은 선, 머리·화살촉·바닥 등 강조부는 채움 (작은 홈 그리드에서 또렷).

interface IconProps { size?: number; className?: string; }

const svgBase = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  xmlns: 'http://www.w3.org/2000/svg',
  className,
  'aria-hidden': true as const,
});

export const SkiShopIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M2 8.5 L4.5 4 H19.5 L22 8.5 Z" fill="currentColor" stroke="none"/>
    <path d="M4 8.5 H20 V20.5 H4 Z M9.5 20.5 V14 H14.5 V20.5 Z" fill="currentColor" fillRule="evenodd" stroke="none"/>
    <path d="M2 20.5 H22"/>
  </svg>
);

export const MaintenanceIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <rect x="3" y="17.5" width="18" height="3" rx="1.5" fill="currentColor" stroke="none"/>
    <path d="M6.5 9.5 h11 v3 a1 1 0 0 1-1 1 H7.5 a1 1 0 0 1-1-1 Z" fill="currentColor" stroke="none"/>
    <path d="M9.5 9.5 V7.5 a2.5 2.5 0 0 1 5 0 V9.5"/>
  </svg>
);

export const SecondHandIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M4.5 8.5 H15.5"/>
    <path d="M15 5.4 L19.8 8.5 L15 11.6 Z" fill="currentColor" stroke="none"/>
    <path d="M19.5 15.5 H8.5"/>
    <path d="M9 12.4 L4.2 15.5 L9 18.6 Z" fill="currentColor" stroke="none"/>
  </svg>
);

export const RentalIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M6 21 H9 V9.5 C9 7 8.4 5.5 7.5 5.5 S6 7 6 9.5 Z" fill="currentColor" stroke="none"/>
    <path d="M11 21 H14 V9.5 C14 7 13.4 5.5 12.5 5.5 S11 7 11 9.5 Z" fill="currentColor" stroke="none"/>
    <path d="M18 20.6 V6.4"/>
    <path d="M16.8 6 H19.2"/>
    <path d="M16.5 18 H19.5"/>
  </svg>
);

export const LessonIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <circle cx="6.5" cy="3.6" r="2.3" fill="currentColor" stroke="none"/>
    <path d="M6.5 5.9 V11.2"/>
    <path d="M6.5 7.8 L4.2 9.8"/>
    <path d="M6.5 8.1 L11.8 10.6"/>
    <path d="M6.5 11.2 L4.1 16.8"/>
    <path d="M6.5 11.2 L8.9 16.8"/>
    <path d="M2.9 14.4 L6.2 21"/>
    <path d="M10.1 14.4 L6.8 21"/>
    <circle cx="18" cy="5" r="2.1" fill="currentColor" stroke="none"/>
    <path d="M18 7.1 V11.8"/>
    <path d="M18 8.8 L11.8 10.6"/>
    <path d="M18 8.8 L20.2 10.8"/>
    <path d="M18 11.8 L15.7 17"/>
    <path d="M18 11.8 L20.3 17"/>
    <path d="M14.6 14.8 L17.7 21"/>
    <path d="M21.4 14.8 L18.3 21"/>
  </svg>
);

export const AccommodationIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M2.5 12.5 H16 a5.5 5.5 0 0 1 5.5 5.5 V19.5 H2.5 Z" fill="currentColor" stroke="none"/>
    <path d="M2.5 19.5 V7.5"/>
    <path d="M5.5 12.5 V9.5 H10 V12.5"/>
  </svg>
);

export const CommunityIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M3 5 h14 a2 2 0 0 1 2 2 v6 a2 2 0 0 1-2 2 H9.5 L5.5 18.5 V15 H3 a2 2 0 0 1-2-2 V7 a2 2 0 0 1 2-2 Z M4.9 10 a1.1 1.1 0 1 1 2.2 0 a1.1 1.1 0 1 1 -2.2 0 M8.9 10 a1.1 1.1 0 1 1 2.2 0 a1.1 1.1 0 1 1 -2.2 0 M12.9 10 a1.1 1.1 0 1 1 2.2 0 a1.1 1.1 0 1 1 -2.2 0" fill="currentColor" fillRule="evenodd" stroke="none"/>
  </svg>
);

export const ScheduleIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M7.5 2.5 V5.5"/>
    <path d="M16.5 2.5 V5.5"/>
    <path d="M2.5 7.5 A2.5 2.5 0 0 1 5 5 H19 A2.5 2.5 0 0 1 21.5 7.5 V19 A2.5 2.5 0 0 1 19 21.5 H5 A2.5 2.5 0 0 1 2.5 19 Z M2.5 9.8 H21.5 V10.9 H2.5 Z M10.2 15.8 a1.8 1.8 0 1 1 3.6 0 a1.8 1.8 0 1 1 -3.6 0" fill="currentColor" fillRule="evenodd" stroke="none"/>
  </svg>
);

export const LivecamIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M6 10 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0 M9.8 10 a2.2 2.2 0 1 1 4.4 0 a2.2 2.2 0 1 1 -4.4 0" fill="currentColor" fillRule="evenodd" stroke="none"/>
    <path d="M12 16.4 V19"/>
    <path d="M7.5 21 H16.5"/>
  </svg>
);

export const OverseasIcon = ({ size = 32, className }: IconProps) => (
  <svg {...svgBase(size, className)}>
    <path d="M2 19.5 L8.5 9.5 L11.6 14.7 L15.5 9 L21.8 19.5 Z" fill="currentColor" stroke="none"/>
    <path d="M15.5 9.5 V4.5"/>
    <path d="M15.5 4.5 H19 L18 6 L19 7.5 H15.5 Z" fill="currentColor" stroke="none"/>
  </svg>
);

export const categoryIcons = {
  skishop: SkiShopIcon,
  overseas: OverseasIcon,
  repair: MaintenanceIcon,
  used: SecondHandIcon,
  rental: RentalIcon,
  lesson: LessonIcon,
  accommodation: AccommodationIcon,
  community: CommunityIcon,
  competitions: ScheduleIcon,
  webcam: LivecamIcon,
};
