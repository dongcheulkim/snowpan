interface LogoProps { withText?: boolean; className?: string; }

// Pure typographic wordmark — dark text with a sky-blue underline. No pill, no bg.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  if (!withText) {
    return (
      <span className={`inline-flex items-baseline ${className}`}>
        <span className="text-xl font-black tracking-tight text-gray-900 leading-none border-b-[3px] border-sky-500 pb-0.5">판</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-baseline select-none ${className}`}>
      <span className="text-2xl font-black tracking-tight text-gray-900 leading-none border-b-[3px] border-sky-500 pb-0.5">스노우판</span>
    </span>
  );
}
