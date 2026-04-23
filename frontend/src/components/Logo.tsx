interface LogoProps { withText?: boolean; className?: string; }

// Snowflake mark + 스노우판 wordmark
// - Six-point snowflake with a subtle arc suggesting a ski turn
// - Wordmark uses brand accent color
export default function Logo({ withText = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="w-7 h-7" aria-hidden="true">
        <defs>
          <linearGradient id="snowpan-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#snowpan-g)" />
        <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none">
          <line x1="20" y1="8" x2="20" y2="32" />
          <line x1="9.6" y1="14" x2="30.4" y2="26" />
          <line x1="9.6" y1="26" x2="30.4" y2="14" />
          <circle cx="20" cy="20" r="3" fill="#ffffff" stroke="none" />
        </g>
        {/* ski turn arc */}
        <path d="M 8 28 Q 20 34 32 28" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
      </svg>
      {withText && (
        <span className="text-xl font-black tracking-tight text-accent-light leading-none">
          스노우<span className="text-sky-500">판</span>
        </span>
      )}
    </span>
  );
}
