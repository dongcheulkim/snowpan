import { useState } from 'react';
import { canCustomerCancel, canOwnerCancel, canOwnerRespond, type ReservationStatus } from '../utils/reservation';

// 방문 예약 카드의 버튼 묶음 — 채팅 카드(Chat)와 사장님 예약 관리(ShopReservations)가 같이 쓴다.
// 사장님: 요청됨 → [예약 확정](메시지 선택) [거절](사유 선택), 확정 → [예약 취소]. 손님: 요청됨·확정 → [예약 취소].
// tone='dark' 는 내 말풍선(검정 배경) 안에 들어갈 때.
interface Props {
  status: ReservationStatus;
  role: 'owner' | 'customer' | null;
  busy?: boolean;
  tone?: 'light' | 'dark';
  onConfirm: (message: string) => void | Promise<void>;
  onDecline: (reason: string) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

export default function ReservationActions({ status, role, busy = false, tone = 'light', onConfirm, onDecline, onCancel }: Props) {
  const [mode, setMode] = useState<'confirm' | 'decline' | null>(null);
  const [text, setText] = useState('');

  if (!role) return null;
  const ownerRespond = role === 'owner' && canOwnerRespond(status);
  const canCancel = role === 'owner' ? canOwnerCancel(status) : canCustomerCancel(status);
  if (!ownerRespond && !canCancel) return null;

  const dark = tone === 'dark';
  const primary = `flex-1 min-h-11 px-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`;
  const secondary = `flex-1 min-h-11 px-3 rounded-xl text-sm font-bold border transition-colors disabled:opacity-40 ${dark ? 'bg-white/10 text-white border-white/30 hover:bg-white/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`;
  const inputClass = `w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none ${dark ? 'bg-white/10 border-white/30 text-white placeholder-white/50 focus:border-white/60' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-sky-400'}`;

  const submitMode = async () => {
    if (!mode || busy) return;
    const v = text.trim().slice(0, 300);
    if (mode === 'confirm') await onConfirm(v); else await onDecline(v);
    setMode(null); setText('');
  };

  const cancel = async () => {
    if (busy) return;
    if (!confirm(role === 'owner' ? '확정한 예약을 취소할까요? 손님에게 취소 알림이 가요.' : '예약을 취소할까요?')) return;
    await onCancel();
  };

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {ownerRespond && mode === null && (
        <div className="flex gap-2">
          <button type="button" onClick={() => { setMode('confirm'); setText(''); }} disabled={busy} className={primary}>예약 확정</button>
          <button type="button" onClick={() => { setMode('decline'); setText(''); }} disabled={busy} className={secondary}>거절</button>
        </div>
      )}
      {ownerRespond && mode !== null && (
        <div className="space-y-2">
          <p className={`text-[11px] ${dark ? 'text-white/70' : 'text-gray-500'}`}>
            {mode === 'confirm' ? '손님에게 전할 말이 있으면 적어 주세요. 비워 두어도 돼요.' : '거절 사유를 적으면 손님이 이해하기 쉬워요. 비워 두어도 돼요.'}
          </p>
          <input
            type="text"
            value={text}
            maxLength={300}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submitMode(); } }}
            placeholder={mode === 'confirm' ? '예: 10시까지 오시면 준비해 둘게요.' : '예: 그날은 예약이 모두 찼어요.'}
            className={inputClass}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="button" onClick={submitMode} disabled={busy} className={primary}>
              {busy ? '처리 중...' : mode === 'confirm' ? '확정 보내기' : '거절 보내기'}
            </button>
            <button type="button" onClick={() => { setMode(null); setText(''); }} disabled={busy} className={secondary}>닫기</button>
          </div>
        </div>
      )}
      {canCancel && (
        <button type="button" onClick={cancel} disabled={busy} className={`w-full ${secondary}`}>
          {busy ? '처리 중...' : '예약 취소'}
        </button>
      )}
    </div>
  );
}
