import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import { RESERVE_TITLE, type Reservation, type ReservationDetails, type ShopType } from '../utils/reservation';

// 방문 예약 바텀시트 (결제 없음) — 날짜·시간·인원·업종별 항목·요청사항을 받아 POST /reservations 로 보낸다.
// 성공하면 서버가 사장님과의 채팅방(roomId)에 예약 카드를 넣어 주므로 onCreated(roomId) 로 그 방으로 보낸다.
interface Props {
  open: boolean;
  shopType: ShopType;
  shopId: string;
  shopName: string;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

const RENTAL_OPTIONS = ['의류', '헬멧', '고글'];
const SKISHOP_PURPOSES = ['구매 상담', '부츠 피팅', '장비 수령', '기타'];
const LESSON_LEVELS = ['처음', '초급', '중급', '상급'];
const LESSON_TYPES = ['개인', '그룹'];
// 정비샵 (2026-09-22) — 장비 종류·수량 + 정비 항목(복수)
const REPAIR_EQUIPMENT = ['스키', '보드', '스키·보드'];
const REPAIR_SERVICES = ['왁싱', '엣지 정비', '베이스 수리', '바인딩 점검', '기타'];
// 08:00 ~ 20:00, 30분 간격
const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let m = 8 * 60; m <= 20 * 60; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
})();

// 오늘(KST) 'YYYY-MM-DD' — 날짜 입력 min 용
function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clampCount(s: string, max = 99): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-11 px-3.5 rounded-full text-xs font-bold transition-all ${on ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
      {label}
    </button>
  );
}

export default function ReservationForm({ open, shopType, shopId, shopName, onClose, onCreated }: Props) {
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [note, setNote] = useState('');
  // rental
  const [ski, setSki] = useState('0');
  const [board, setBoard] = useState('0');
  const [options, setOptions] = useState<string[]>([]);
  // skishop
  const [purpose, setPurpose] = useState('');
  // lesson
  const [level, setLevel] = useState('');
  const [lessonType, setLessonType] = useState('');
  // accommodation
  const [rooms, setRooms] = useState('1');
  // repair
  const [equipment, setEquipment] = useState('');
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isStay = shopType === 'accommodation';
  const isRental = shopType === 'rental';
  const isRepair = shopType === 'repair'; // 정비샵은 인원 대신 장비·정비 항목
  const title = RESERVE_TITLE[shopType];
  const minDate = todayKst();
  const inputClass = 'w-full min-h-11 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400';
  const smallLabel = 'block text-[11px] text-gray-500 mb-1';
  const sectionLabel = 'text-xs font-bold text-gray-700 mb-1.5';

  const toggleOption = (o: string) => setOptions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const submit = async () => {
    if (submitting) return;
    if (!date) { toastError(isStay ? '체크인 날짜를 골라 주세요.' : '날짜를 골라 주세요.'); return; }
    if (date < minDate) { toastError('지난 날짜는 고를 수 없어요.'); return; }
    if (isStay) {
      if (!endDate) { toastError('체크아웃 날짜를 골라 주세요.'); return; }
      if (endDate <= date) { toastError('체크아웃은 체크인 다음 날부터 고를 수 있어요.'); return; }
    } else if (endDate && endDate < date) { toastError('반납일은 이용일보다 빠를 수 없어요.'); return; }
    const a = isRepair ? 1 : clampCount(adults);
    const c = isRepair ? 0 : clampCount(children);
    if (a + c === 0) { toastError('인원을 입력해 주세요.'); return; }

    const details: ReservationDetails = {};
    if (isRental) {
      const s = clampCount(ski); const b = clampCount(board);
      if (s) details.ski = s;
      if (b) details.board = b;
      if (options.length) details.options = options;
    } else if (shopType === 'skishop') {
      if (purpose) details.purpose = purpose;
    } else if (shopType === 'lesson') {
      if (level) details.level = level;
      if (lessonType) details.lessonType = lessonType;
    } else if (isRepair) {
      if (equipment) details.equipment = equipment;
      details.qty = Math.max(1, clampCount(qty));
      if (options.length) details.options = options;
    } else if (isStay) {
      details.rooms = Math.max(1, clampCount(rooms));
    }
    const trimmedNote = note.trim().slice(0, 300);
    const body = {
      shopType, shopId, date,
      ...(endDate ? { endDate } : {}),
      ...(time && !isStay ? { time } : {}),
      adults: a, children: c,
      ...(Object.keys(details).length ? { details } : {}),
      ...(trimmedNote ? { note: trimmedNote } : {}),
    };
    setSubmitting(true);
    try {
      const res = await api<{ reservation: Reservation; roomId: string }>('/reservations', { method: 'POST', body });
      toastSuccess('예약을 요청했어요. 사장님이 확인하면 알려 드릴게요.');
      onCreated(res.roomId);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '예약 요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-[slideUp_.25s_ease-out]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        <div>
          <h3 className="text-base font-bold text-gray-900">{shopName} {title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">결제는 없어요. 사장님이 확인하고 확정하면 알림으로 알려 드려요.</p>
        </div>

        {/* 날짜 — 렌탈은 이용일·반납일, 숙소는 체크인·체크아웃, 나머지는 방문 날짜 하나 */}
        <div>
          <p className={sectionLabel}>{isStay ? '숙박 날짜' : isRental ? '이용 날짜' : '방문 날짜'}</p>
          {isRental || isStay ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={smallLabel}>{isStay ? '체크인' : '이용일'}</label>
                <input type="date" min={minDate} value={date} onChange={(e) => { setDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }} className={inputClass} />
              </div>
              <div>
                <label className={smallLabel}>{isStay ? '체크아웃' : '반납일 (선택)'}</label>
                <input type="date" min={date || minDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              </div>
            </div>
          ) : (
            <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          )}
        </div>

        {!isStay && (
          <div>
            <p className={sectionLabel}>시간 <span className="font-normal text-gray-500">(선택)</span></p>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={inputClass}>
              <option value="">시간은 채팅으로 정할게요</option>
              {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {!isRepair && (
        <div>
          <p className={sectionLabel}>인원</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={smallLabel}>성인</label>
              <input type="number" inputMode="numeric" min={0} max={99} value={adults} onChange={(e) => setAdults(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={smallLabel}>아동</label>
              <input type="number" inputMode="numeric" min={0} max={99} value={children} onChange={(e) => setChildren(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
        )}

        {isRental && (
          <>
            <div>
              <p className={sectionLabel}>장비</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={smallLabel}>스키 세트</label>
                  <input type="number" inputMode="numeric" min={0} max={99} value={ski} onChange={(e) => setSki(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={smallLabel}>보드 세트</label>
                  <input type="number" inputMode="numeric" min={0} max={99} value={board} onChange={(e) => setBoard(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <div>
              <p className={sectionLabel}>옵션</p>
              <div className="flex flex-wrap gap-1.5">
                {RENTAL_OPTIONS.map((o) => <Chip key={o} label={o} on={options.includes(o)} onClick={() => toggleOption(o)} />)}
              </div>
            </div>
          </>
        )}

        {shopType === 'skishop' && (
          <div>
            <p className={sectionLabel}>방문 목적</p>
            <div className="flex flex-wrap gap-1.5">
              {SKISHOP_PURPOSES.map((p) => <Chip key={p} label={p} on={purpose === p} onClick={() => setPurpose(purpose === p ? '' : p)} />)}
            </div>
          </div>
        )}

        {isRepair && (
          <>
            <div>
              <p className={sectionLabel}>장비</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {REPAIR_EQUIPMENT.map((g) => <Chip key={g} label={g} on={equipment === g} onClick={() => setEquipment(equipment === g ? '' : g)} />)}
              </div>
              <label className={smallLabel}>맡길 장비 수</label>
              <input type="number" inputMode="numeric" min={1} max={99} value={qty} onChange={(e) => setQty(e.target.value)} className={inputClass} />
            </div>
            <div>
              <p className={sectionLabel}>정비 항목 <span className="font-normal text-gray-500">(여러 개 선택)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {REPAIR_SERVICES.map((o) => <Chip key={o} label={o} on={options.includes(o)} onClick={() => toggleOption(o)} />)}
              </div>
            </div>
          </>
        )}

        {shopType === 'lesson' && (
          <>
            <div>
              <p className={sectionLabel}>수준</p>
              <div className="flex flex-wrap gap-1.5">
                {LESSON_LEVELS.map((l) => <Chip key={l} label={l} on={level === l} onClick={() => setLevel(level === l ? '' : l)} />)}
              </div>
            </div>
            <div>
              <p className={sectionLabel}>레슨 형태</p>
              <div className="flex flex-wrap gap-1.5">
                {LESSON_TYPES.map((l) => <Chip key={l} label={l} on={lessonType === l} onClick={() => setLessonType(lessonType === l ? '' : l)} />)}
              </div>
            </div>
          </>
        )}

        {isStay && (
          <div>
            <p className={sectionLabel}>객실 수</p>
            <input type="number" inputMode="numeric" min={1} max={99} value={rooms} onChange={(e) => setRooms(e.target.value)} className={inputClass} />
          </div>
        )}

        <div>
          <p className={sectionLabel}>요청사항 <span className="font-normal text-gray-500">(선택)</span></p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={3}
            maxLength={300}
            placeholder={isRental ? '예: 키 175 발 270이에요. 초보라 짧은 스키 부탁드려요.' : isRepair ? '예: 엣지가 많이 상했어요. 당일 찾을 수 있는지 궁금해요.' : isStay ? '예: 늦은 체크인 가능한지 궁금해요.' : shopType === 'lesson' ? '예: 아이 둘이 같이 받고 싶어요.' : '예: 부츠 사이즈 270 재고 있는지 궁금해요.'}
            className={`${inputClass} resize-none`}
          />
          <p className="text-[10px] text-gray-500 text-right mt-0.5">{note.length}/300</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 min-h-11 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium border border-gray-200 disabled:opacity-40">취소</button>
          <button type="button" onClick={submit} disabled={submitting} className="flex-1 min-h-11 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-all active:scale-[0.98] disabled:opacity-40">
            {submitting ? '요청 중...' : '예약 요청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
