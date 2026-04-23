interface LogoProps { withText?: boolean; className?: string; }

// Pure wordmark — no symbol. "스노우" in dark sky, "판" highlighted in accent pill.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  // withText=false 일 때는 컴팩트한 "판" 배지만 노출 (모바일 작은 공간용)
  if (!withText) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 text-white font-black text-lg tracking-tight">판</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-baseline gap-0.5 select-none ${className}`}>
      <span className="text-2xl font-black tracking-tight text-sky-700 leading-none">스노우</span>
      <span className="text-2xl font-black tracking-tight text-white leading-none bg-sky-500 rounded-md px-1.5 py-0.5">판</span>
    </span>
  );
}
