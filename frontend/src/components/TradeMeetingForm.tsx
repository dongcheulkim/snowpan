import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import type { TradeMeeting } from '../utils/tradeMeeting';

// 거래 약속 제안 바텀시트 (2026-10-09, 결제 없음) — 날짜·시간·장소·한마디를 받아 POST /trade-meetings 로 보낸다.
// 성공하면 서버가 채팅방에 약속 카드(type 'trade_meeting')를 넣어 주므로 화면은 소켓으로 따라온다.
interface Props {
  open: boolean;
  roomId: string;
  productId: string;
  productName: string;
  onClose: () => void;
  onCreated: (meeting: TradeMeeting) => void;
}

const RECENT_PLACES_KEY = 'snowpan:meeting-places';
// 06:00 ~ 23:00, 30분 간격
const TIME_SLOTS = (() => {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 23 * 60; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
})();
const todayKst = (): string => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const loadRecentPlaces = (): string[] => { try { const v = JSON.parse(localStorage.getItem(RECENT_PLACES_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5) : []; } catch { return []; } };

export default function TradeMeetingForm({ open, roomId, productId, productName, onClose, onCreated }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setDate(''); setTime(''); setPlace(''); setNote(''); setSubmitting(false);
    setRecent(loadRecentPlaces());
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (submitting) return;
    if (!date) { toastError('만날 날짜를 골라 주세요.'); return; }
    if (!place.trim()) { toastError('만날 장소를 적어 주세요.'); return; }
    setSubmitting(true);
    try {
      const r = await api<{ meeting: TradeMeeting }>('/trade-meetings', { method: 'POST', body: { roomId, productId, date, time: time || undefined, place: place.trim(), note: note.trim() || undefined } });
      try { localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify([place.trim(), ...recent.filter((p) => p !== place.trim())].slice(0, 5))); } catch { /* 저장 불가 환경 */ }
      toastSuccess('약속을 제안했어요. 상대가 수락하면 확정돼요.');
      onCreated(r.meeting);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '약속을 제안하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="meeting-title">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-[max(20px,env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 id="meeting-title" className="text-base font-bold text-gray-900">거래 약속 잡기</h2>
          <button type="button" onClick={onClose} className="min-w-11 min-h-11 flex items-center justify-center text-gray-500" aria-label="닫기">닫기</button>
        </div>
        <p className="text-xs text-gray-500 mb-4 truncate">"{productName}" · 상대가 수락하면 매물이 예약중으로 바뀌어요</p>

        <label className="block text-xs font-bold text-gray-700 mb-1.5" htmlFor="meeting-date">날짜</label>
        <input id="meeting-date" type="date" min={todayKst()} value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-11 px-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-white" />

        <label className="block text-xs font-bold text-gray-700 mt-4 mb-1.5" htmlFor="meeting-time">시간 <span className="font-normal text-gray-500">(선택)</span></label>
        <select id="meeting-time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full min-h-11 px-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-white">
          <option value="">나중에 정할게요</option>
          {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="block text-xs font-bold text-gray-700 mt-4 mb-1.5" htmlFor="meeting-place">장소</label>
        <input id="meeting-place" type="text" maxLength={60} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 곤지암리조트 정문, 분당선 서현역 2번 출구" className="w-full min-h-11 px-3 rounded-xl border border-gray-200 text-base text-gray-900 bg-white placeholder-gray-400" />
        {recent.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recent.map((p) => (
              <button key={p} type="button" onClick={() => setPlace(p)} className="min-h-9 px-3 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-700">{p}</button>
            ))}
          </div>
        )}

        <label className="block text-xs font-bold text-gray-700 mt-4 mb-1.5" htmlFor="meeting-note">한마디 <span className="font-normal text-gray-500">(선택)</span></label>
        <textarea id="meeting-note" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 검은색 패딩 입고 갈게요" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base text-gray-900 bg-white placeholder-gray-400 resize-none" />

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">사람이 많은 공공장소에서 만나고, 장비 상태를 확인한 뒤 결제해 주세요. 스노우판은 결제·송금에 관여하지 않아요.</p>
        <button type="button" onClick={submit} disabled={submitting} className="w-full min-h-12 mt-4 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40">
          {submitting ? '보내는 중...' : '약속 제안하기'}
        </button>
      </div>
    </div>
  );
}
