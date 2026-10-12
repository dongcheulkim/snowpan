// 숫자만 받는 입력칸 + 단위 표시 (2026-10-12, 사장님 "숫자만 입력되게, 길이는 cm 자동으로").
// 값은 숫자(문자열)만 저장하고 단위는 오른쪽에 붙여 보여준다. 저장할 때는 호출 쪽에서 `${value}${unit}` 로 합친다.
interface Props {
  name: string;
  value: string;
  onChange: (digits: string) => void;
  unit?: string;          // 'cm' | 'mm' | 'm' 등. 없으면 숫자만
  placeholder?: string;
  decimal?: boolean;      // 소수점 허용 (회전반경 17.5m)
  maxLen?: number;
  className?: string;
}

export default function UnitInput({ name, value, onChange, unit, placeholder, decimal = false, maxLen = 6, className = '' }: Props) {
  const clean = (v: string) => {
    let s = v.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
    if (decimal) { const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ''); }
    return s.slice(0, maxLen);
  };
  return (
    <div className="relative">
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        name={name}
        value={value}
        onChange={(e) => onChange(clean(e.target.value))}
        placeholder={placeholder}
        className={`${className} ${unit ? 'pr-12' : ''}`}
        aria-label={unit ? `${name} (${unit})` : undefined}
      />
      {unit && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">{unit}</span>}
    </div>
  );
}
