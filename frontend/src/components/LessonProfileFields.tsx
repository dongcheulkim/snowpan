// 레슨 등록·수정 공용 — 가격표·경력·언어·가능 시간·소개 영상 (2026-10-07, 레슨 전문 앱과 겨루기 위한 구조화 정보)
import { LESSON_LANGUAGES, PRICE_PRESETS, type LessonProfile, type PriceRow } from '../utils/lessonProfile';

interface Props { value: LessonProfile; onChange: (v: LessonProfile) => void; inputClass: string; labelClass: string }

export default function LessonProfileFields({ value, onChange, inputClass, labelClass }: Props) {
  const set = (patch: Partial<LessonProfile>) => onChange({ ...value, ...patch });
  const setRow = (i: number, patch: Partial<PriceRow>) => set({ priceRows: value.priceRows.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const num = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 8);
  return (
    <>
      <div>
        <label className={labelClass}>가격표 <span className="font-normal text-gray-500">(손님이 가장 먼저 보는 정보예요)</span></label>
        <div className="space-y-2">
          {value.priceRows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input list="lesson-price-presets" value={r.label} onChange={(e) => setRow(i, { label: e.target.value.slice(0, 40) })} placeholder="예: 1:1 2시간" className={`${inputClass} flex-1 min-w-0`} />
              <div className="relative w-32 shrink-0">
                <input inputMode="numeric" value={r.price} onChange={(e) => setRow(i, { price: num(e.target.value) })} placeholder="120000" className={`${inputClass} pr-7 tabular-nums`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">원</span>
              </div>
              {value.priceRows.length > 1 && (
                <button type="button" onClick={() => set({ priceRows: value.priceRows.filter((_, k) => k !== i) })} aria-label="줄 삭제" className="shrink-0 w-10 rounded-lg bg-gray-100 text-gray-500 text-lg leading-none">×</button>
              )}
            </div>
          ))}
          <datalist id="lesson-price-presets">{PRICE_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
          {value.priceRows.length < 8 && (
            <button type="button" onClick={() => set({ priceRows: [...value.priceRows, { label: PRICE_PRESETS[Math.min(value.priceRows.length, PRICE_PRESETS.length - 1)], price: '' }] })} className="text-xs font-bold text-gray-700 bg-gray-100 rounded-lg px-3 py-2">+ 줄 추가</button>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">가장 낮은 가격이 목록에 "N원~"으로 보이고, 가격순 정렬에도 쓰여요. 장비·리프트권 포함 여부는 상세 설명에 적어 주세요.</p>
      </div>

      <div>
        <label className={labelClass}>경력·자격 <span className="font-normal text-gray-500">(선택)</span></label>
        <input value={value.career} onChange={(e) => set({ career: e.target.value.slice(0, 300) })} placeholder="예: KSIA 레벨2, 경력 8년, 전 데몬스트레이터" className={inputClass} />
        <p className="text-[11px] text-gray-500 mt-1.5">아래에 자격증 사진을 올리면 관리자 확인 뒤 "자격 확인" 배지가 붙어요.</p>
      </div>

      <div>
        <label className={labelClass}>가능 언어</label>
        <div className="flex flex-wrap gap-1.5">
          {LESSON_LANGUAGES.map((l) => (
            <button key={l} type="button" aria-pressed={value.languages.includes(l)} onClick={() => set({ languages: value.languages.includes(l) ? value.languages.filter((x) => x !== l) : [...value.languages, l] })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${value.languages.includes(l) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>가능 시간 <span className="font-normal text-gray-500">(선택)</span></label>
        <input value={value.schedule} onChange={(e) => set({ schedule: e.target.value.slice(0, 200) })} placeholder="예: 주중 09~17시, 주말 가능, 야간 가능" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>소개 영상 <span className="font-normal text-gray-500">(선택, 유튜브·인스타그램 주소)</span></label>
        <input type="url" inputMode="url" value={value.videoUrl} onChange={(e) => set({ videoUrl: e.target.value.slice(0, 300) })} placeholder="https://youtu.be/..." className={inputClass} />
      </div>
    </>
  );
}
