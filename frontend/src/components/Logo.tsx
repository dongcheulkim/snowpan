interface LogoProps { withText?: boolean; className?: string; }

// English wordmark with a sky-blue underline.
export default function Logo({ withText = true, className = '' }: LogoProps) {
  if (!withText) {
    return (
      <span className={`inline-flex items-baseline ${className}`}>
        <span className="text-xl font-black tracking-tight text-gray-900 leading-none border-b-[3px] border-sky-500 pb-0.5">S</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-baseline select-none ${className}`}>
      <span className="text-2xl font-black tracking-tight text-gray-900 leading-none border-b-[3px] border-sky-500 pb-0.5">SNOWPAN</span>
    </span>
  );
}
