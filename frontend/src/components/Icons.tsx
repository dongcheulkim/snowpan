// 통합 모노크롬 SVG 아이콘 라이브러리.
// 이모지 대체용. 모두 fill="currentColor" 또는 stroke="currentColor" 라
// 부모의 text-* 색상을 따라감. viewBox 24×24 통일.

interface IconProps { size?: number; className?: string; strokeWidth?: number; }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
  className,
  'aria-hidden': true as const,
});

// ── Filled (단색 실루엣) ──

// ❤ filled heart (찜됨)
export const HeartFilledIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)} fill="currentColor"><path d="M12 21s-7-4.5-9.5-9.5C.6 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.9 3.5 4 7.5C19 16.5 12 21 12 21z"/></svg>
);

// ♡ outline heart (찜 안됨)
export const HeartOutlineIcon = ({ size = 20, className, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9.5C.6 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.9 3.5 4 7.5C19 16.5 12 21 12 21z"/></svg>
);

// ★ star
export const StarIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)} fill="currentColor"><path d="M12 2l2.7 6.5 7 .5-5.4 4.5 1.7 6.7L12 16.6 5.9 20.2l1.7-6.7L2.3 9l7-.5L12 2z"/></svg>
);

// 📦 package / empty state
export const PackageIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8L12 3 3 8m18 0v8l-9 5-9-5V8m18 0l-9 5m0 0L3 8m9 5v8"/></svg>
);

// 👤 user
export const UserIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>
);

// 👥 users
export const UsersIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.5c3 0 6 2 6 5"/></svg>
);

// 💬 chat bubble
export const ChatIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.5-4 8-9 8a10 10 0 01-3.5-.6L4 21l1.6-3.5C4.6 16 4 14.1 4 12c0-4.5 4-8 8.5-8S21 7.5 21 12z"/></svg>
);

// 📍 location pin
export const LocationIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>
);

// 📷 camera
export const CameraIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 012-2h2.5l1.5-2h6l1.5 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="4"/></svg>
);

// 📄 document
export const DocumentIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>
);

// 📋 clipboard
export const ClipboardIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="3" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>
);

// 📅 calendar
export const CalendarIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
);

// ⚠ warning
export const WarningIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.3L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.3a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
);

// ✓ check
export const CheckIcon = ({ size = 20, className, strokeWidth = 2.5 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11"/></svg>
);

// ✕ close X
export const CloseIcon = ({ size = 20, className, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
);

// 🔔 bell
export const BellIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 4 1.5 6 1.5 6H4.5S6 12 6 8z"/><path d="M10 19a2 2 0 004 0"/></svg>
);

// 🔥 fire / hot
export const FireIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)} fill="currentColor"><path d="M12 2c-1 4-4 5-4 9 0 2 1.5 4 4 4s4-2 4-4c0-2-1-3-1-5 2 1 5 4 5 8 0 4-3.5 8-8 8s-8-4-8-8c0-5 4-8 8-12z"/></svg>
);

// 📢 megaphone / announce
export const MegaphoneIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a1 1 0 001 1h3l8 5V5L7 10H4a1 1 0 00-1 1z"/><path d="M19 8a4 4 0 010 8"/></svg>
);

// 🏆 trophy
export const TrophyIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 11-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/><path d="M9 18h6M10 22h4M12 14v4"/></svg>
);

// 🔍 search
export const SearchIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>
);

// 🛡 shield
export const ShieldIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z"/></svg>
);

// 🕐 clock
export const ClockIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);

// 📞 phone
export const PhoneIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L7.9 9.7a16 16 0 006.4 6.4l1.3-1.3a2 2 0 012-.5c.9.3 1.7.5 2.6.6a2 2 0 011.8 2z"/></svg>
);

// 💰 money
export const MoneyIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a2 2 0 010 4H9m6 4H9"/></svg>
);

// 🏦 bank
export const BankIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l10-6 10 6"/><path d="M4 10v8M9 10v8M15 10v8M20 10v8M2 21h20"/></svg>
);

// 📊 chart
export const ChartIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="14" width="3" height="4"/></svg>
);

// 🚨 alert (siren)
export const AlertIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
);

// 🤖 bot
export const BotIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.5"/><circle cx="15" cy="13" r="1.5"/><path d="M12 4v4M9 18h6"/></svg>
);

// 🏔 mountain
export const MountainIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M2 20l6-12 4 7 3-5 7 10H2z"/></svg>
);

// 📭 inbox empty / empty state
export const InboxIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l3-9h12l3 9M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 13h5l1 3h6l1-3h5"/></svg>
);

// 🚫 prohibited / blocked
export const ProhibitIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>
);

// 😢 sad face (empty state)
export const SadIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M9 16s1-2 3-2 3 2 3 2"/></svg>
);

// 🎿 ski — 두 평행 스키 (위쪽 휘어진 팁), 보드와 동일 각도 -35°.
// 폴/부츠/바인딩 다 제외, 단색 currentColor.
export const SkiIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)} fill="currentColor"><g transform="rotate(-35 12 12)"><path d="M 7.5 22 L 7.5 5 Q 7.5 1 10 1 Q 11 1.5 10.5 3 Q 9.5 3 9.5 5 L 9.5 22 Z"/><path d="M 14 22 L 14 5 Q 14 1 16.5 1 Q 17.5 1.5 17 3 Q 16 3 16 5 L 16 22 Z"/></g></svg>
);

// 🏂 snowboard (board outline with bindings)
export const SnowboardIcon = ({ size = 20, className, strokeWidth = 1.7 }: IconProps) => (
  <svg {...base(size, className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><g transform="rotate(-35 12 12)"><rect x="2.5" y="9.5" width="19" height="5" rx="2.5"/><path d="M8.5 9.5v5M15.5 9.5v5"/></g></svg>
);

// ✕ small close (for chips)
export const XIcon = CloseIcon;
