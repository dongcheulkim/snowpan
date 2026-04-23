interface LogoProps { withText?: boolean; className?: string; }

export default function Logo({ withText = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="w-8 h-8" aria-hidden="true">
        <defs>
          <linearGradient id="snowpan-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#snowpan-logo-bg)" />
        <g stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <line x1="32" y1="14" x2="32" y2="50" />
          <line x1="15.4" y1="22.4" x2="48.6" y2="41.6" />
          <line x1="15.4" y1="41.6" x2="48.6" y2="22.4" />
        </g>
        <g fill="#ffffff">
          <circle cx="32" cy="14" r="2.4" />
          <circle cx="32" cy="50" r="2.4" />
          <circle cx="15.4" cy="22.4" r="2.4" />
          <circle cx="15.4" cy="41.6" r="2.4" />
          <circle cx="48.6" cy="22.4" r="2.4" />
          <circle cx="48.6" cy="41.6" r="2.4" />
          <circle cx="32" cy="32" r="4.5" />
        </g>
      </svg>
      {withText && (
        <span className="text-xl font-black tracking-tight leading-none">
          <span className="text-sky-600">스노우</span><span className="text-sky-500">판</span>
        </span>
      )}
    </span>
  );
}
