import { DAY_CHIPS, type ShopHoursValue } from '../utils/shopHoursForm';

// 등록·수정 폼 공통 "영업시간" 블록 — 시작/종료 시각(30분 단위) + 휴무일 칩(월~일 토글).
// 스키·보드샵/정비샵/렌탈샵 6개 폼에서 같이 쓴다. 값·상수·API 매핑은 utils/shopHoursForm.ts.
// 자유 텍스트 '영업시간 메모'는 각 폼이 따로 둔다.
interface Props {
  value: ShopHoursValue;
  onChange: (patch: Partial<ShopHoursValue>) => void;
  inputClass: string;
  labelClass: string;
}

export default function ShopHoursFields({ value, onChange, inputClass, labelClass }: Props) {
  const toggle = (code: string) => {
    const on = value.closedDays.includes(code);
    onChange({ closedDays: on ? value.closedDays.filter((d) => d !== code) : [...value.closedDays, code] });
  };
  return (
    <div>
      <label className={labelClass}>영업시간</label>
      <div className="flex items-center gap-2">
        <input type="time" step={1800} value={value.openTime} onChange={(e) => onChange({ openTime: e.target.value })} aria-label="영업 시작" className={inputClass} />
        <span className="text-sm text-gray-400 flex-shrink-0">~</span>
        <input type="time" step={1800} value={value.closeTime} onChange={(e) => onChange({ closeTime: e.target.value })} aria-label="영업 종료" className={inputClass} />
      </div>
      <p className="text-[11px] text-gray-500 mt-2 mb-1.5">휴무일 (눌러서 선택)</p>
      <div className="flex flex-wrap gap-1.5">
        {DAY_CHIPS.map(({ code, label }) => {
          const on = value.closedDays.includes(code);
          return (
            <button key={code} type="button" onClick={() => toggle(code)} aria-pressed={on}
              className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${on ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">입력하면 목록과 상세에 "영업 중" 표시가 붙어요.</p>
    </div>
  );
}
