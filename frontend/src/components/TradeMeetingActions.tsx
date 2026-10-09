import { useState, type ReactElement } from 'react';
import type { MeetingRole, MeetingStatus } from '../utils/tradeMeeting';

// 거래 약속 카드의 버튼 묶음 (2026-10-09) — 채팅 카드(Chat)에서 쓴다. tone='dark' 는 내 말풍선(검정 배경) 안.
// 제안받은 쪽: [수락] [거절] [다른 시간 제안] / 제안한 쪽: [제안 취소]
// 확정: 판매자 [거래 확정] [약속 취소], 구매자 [약속 취소] / 끝난 약속(취소·거절): 매물이 안 팔렸으면 [다시 약속 잡기]
interface Props {
  status: MeetingStatus;
  role: MeetingRole;
  isProposer: boolean;
  productSold: boolean;
  busy?: boolean;
  tone?: 'light' | 'dark';
  onAccept: () => void | Promise<void>;
  onDecline: (reason: string) => void | Promise<void>;
  onCancel: (reason: string) => void | Promise<void>;
  onComplete: () => void | Promise<void>;
  onRepropose: () => void;
}

export default function TradeMeetingActions({ status, role, isProposer, productSold, busy = false, tone = 'light', onAccept, onDecline, onCancel, onComplete, onRepropose }: Props) {
  const [mode, setMode] = useState<'decline' | 'cancel' | null>(null);
  const [text, setText] = useState('');
  const dark = tone === 'dark';
  const primary = `flex-1 min-h-11 px-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`;
  const secondary = `flex-1 min-h-11 px-3 rounded-xl text-sm font-bold border transition-colors disabled:opacity-40 ${dark ? 'bg-white/10 text-white border-white/30 hover:bg-white/20' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`;
  const inputClass = `w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none ${dark ? 'bg-white/10 border-white/30 text-white placeholder-white/50 focus:border-white/60' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`;

  const submitMode = async () => {
    if (!mode || busy) return;
    const v = text.trim().slice(0, 200);
    if (mode === 'decline') await onDecline(v); else await onCancel(v);
    setMode(null); setText('');
  };

  const complete = async () => {
    if (busy) return;
    if (!confirm('거래를 확정할까요? 매물이 판매완료로 바뀌고 구매자에게 후기 요청이 가요.')) return;
    await onComplete();
  };

  let body: ReactElement | null = null;
  if (mode) {
    body = (
      <div className="space-y-2">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={mode === 'decline' ? '거절 사유 (선택)' : '취소 사유 (선택) 예: 일정이 바뀌었어요'} className={inputClass} />
        <div className="flex gap-2">
          <button type="button" onClick={submitMode} disabled={busy} className={primary}>{busy ? '처리 중...' : mode === 'decline' ? '거절하기' : '약속 취소하기'}</button>
          <button type="button" onClick={() => { setMode(null); setText(''); }} disabled={busy} className={secondary}>돌아가기</button>
        </div>
      </div>
    );
  } else if (status === 'proposed' && !isProposer) {
    body = (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => { if (!busy) onAccept(); }} disabled={busy} className={primary}>{busy ? '처리 중...' : '수락'}</button>
          <button type="button" onClick={() => setMode('decline')} disabled={busy} className={secondary}>거절</button>
        </div>
        <button type="button" onClick={onRepropose} disabled={busy} className={`w-full ${secondary}`}>다른 시간·장소 제안</button>
      </div>
    );
  } else if (status === 'proposed' && isProposer) {
    body = <button type="button" onClick={() => setMode('cancel')} disabled={busy} className={`w-full ${secondary}`}>제안 취소</button>;
  } else if (status === 'confirmed') {
    body = (
      <div className="flex gap-2">
        {role === 'seller' && <button type="button" onClick={complete} disabled={busy} className={primary}>{busy ? '처리 중...' : '거래 확정'}</button>}
        <button type="button" onClick={() => setMode('cancel')} disabled={busy} className={secondary}>약속 취소</button>
      </div>
    );
  } else if ((status === 'cancelled' || status === 'declined') && !productSold) {
    body = <button type="button" onClick={onRepropose} disabled={busy} className={`w-full ${secondary}`}>다시 약속 잡기</button>;
  }
  if (!body) return null;
  return <div className="mt-3" onClick={(e) => e.stopPropagation()}>{body}</div>;
}
