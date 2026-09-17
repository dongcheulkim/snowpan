import { useState } from 'react';
import { toastError } from './Toast';
import { buildRentalInquiry } from '../utils/rentalInquiry';

// 렌탈 "예약 문의" 바텀시트 — 이용 날짜·인원·장비·옵션·요청사항을 받아 채팅 첫 메시지(평문, utils/rentalInquiry.ts)로 만든다.
// 제출하면 onSubmit(message) 만 호출한다. 채팅방 열기와 자동 전송은 RentalDetail 이 Chat 으로 넘긴다
// (navigate('/chat/new', { state: { ..., initialMessage, autoSend: true } })).
interface Props {
  open: boolean;
  shopName: string;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

const OPTIONS = ['의류', '헬멧', '고글'];

// 오늘(KST) 'YYYY-MM-DD' — 날짜 입력 min 용
function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clampCount(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0;
}

export default function RentalInquiryForm({ open, shopName, onClose, onSubmit }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [ski, setSki] = useState('0');
  const [board, setBoard] = useState('0');
  const [options, setOptions] = useState<string[]>([]);
  const [note, setNote] = useState('');

  if (!open) return null;

  const toggleOption = (o: string) => setOptions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const submit = () => {
    if (!start) { toastError('이용 시작 날짜를 골라 주세요.'); return; }
    const endDate = end || start;
    if (endDate < start) { toastError('종료 날짜는 시작 날짜보다 빠를 수 없어요.'); return; }
    const a = clampCount(adults);
    const c = clampCount(children);
    if (a + c === 0) { toastError('인원을 입력해 주세요.'); return; }
    onSubmit(buildRentalInquiry({ start, end: endDate, adults: a, children: c, ski: clampCount(ski), board: clampCount(board), options, note: note.slice(0, 300) }));
  };

  const inputClass = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400';
  const smallLabel = 'block text-[11px] text-gray-500 mb-1';
  const minDate = todayKst();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-[slideUp_.25s_ease-out]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="예약 문의">
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        <div>
          <h3 className="text-base font-bold text-gray-900">예약 문의</h3>
          <p className="text-xs text-gray-500 mt-0.5">{shopName}에 아래 내용이 채팅 첫 메시지로 전달돼요.</p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">이용 날짜</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={smallLabel}>시작</label>
              <input type="date" min={minDate} value={start} onChange={(e) => { setStart(e.target.value); if (end && e.target.value > end) setEnd(e.target.value); }} className={inputClass} />
            </div>
            <div>
              <label className={smallLabel}>종료</label>
              <input type="date" min={start || minDate} value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">인원</p>
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

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">장비</p>
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
          <p className="text-xs font-bold text-gray-700 mb-1.5">옵션</p>
          <div className="flex flex-wrap gap-1.5">
            {OPTIONS.map((o) => {
              const on = options.includes(o);
              return (
                <button key={o} type="button" onClick={() => toggleOption(o)} aria-pressed={on}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${on ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">요청사항 <span className="font-normal text-gray-500">(선택)</span></p>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={3} maxLength={300} placeholder="예: 키 175 발 270이에요. 초보라 짧은 스키 부탁드려요." className={`${inputClass} resize-none`} />
          <p className="text-[10px] text-gray-400 text-right mt-0.5">{note.length}/300</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium border border-gray-200">취소</button>
          <button type="button" onClick={submit} className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-all active:scale-[0.98]">문의 보내기</button>
        </div>
      </div>
    </div>
  );
}
