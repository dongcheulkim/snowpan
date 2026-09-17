import { RENTAL_PRICE_ROWS, type RentalPriceValue } from '../utils/rentalPriceForm';

// 렌탈샵 등록·수정 폼 "가격표 (1일 기준)" 블록 — 스키 세트/보드 세트/의류/헬멧/고글 + 안내 메모.
// 값·상수·API 매핑은 utils/rentalPriceForm.ts.
interface Props {
  value: RentalPriceValue;
  onChange: (patch: Partial<RentalPriceValue>) => void;
  inputClass: string;
  labelClass: string;
}

export default function RentalPriceFields({ value, onChange, inputClass, labelClass }: Props) {
  return (
    <div>
      <label className={labelClass}>가격표 (1일 기준)</label>
      <div className="grid grid-cols-2 gap-3">
        {RENTAL_PRICE_ROWS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-[11px] text-gray-500 mb-1">{label}</p>
            <div className="relative">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
                value={value[key] ? Number(value[key]).toLocaleString() : ''}
                onChange={(e) => onChange({ [key]: e.target.value.replace(/[^\d]/g, '').slice(0, 8) } as Partial<RentalPriceValue>)}
                className={`${inputClass} pr-8 text-right`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">원</span>
            </div>
          </div>
        ))}
      </div>
      <input
        type="text" value={value.priceNote} maxLength={200}
        onChange={(e) => onChange({ priceNote: e.target.value.slice(0, 200) })}
        placeholder="안내 메모 (선택) 예: 시즌권 소지자 20% 할인, 연박 할인"
        className={`${inputClass} mt-3`}
      />
      <p className="text-[10px] text-gray-500 mt-1.5">스키·보드 세트 중 낮은 가격이 목록에 "세트 30,000원~"처럼 표시되고, 가격 낮은 순 정렬에 쓰여요.</p>
    </div>
  );
}
