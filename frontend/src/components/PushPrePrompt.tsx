import { useEffect, useState } from 'react';
import { bindPushPrePrompt, answerPushPrePrompt } from '../utils/pushPrePrompt';

// 알림 권한을 묻기 전에 먼저 보여주는 안내창 (2026-10-03, 사장님 "꼭 필요한 알림만, 광고성 알림은 안 보낸다고 미리 말하고 설정하게").
// iOS 는 시스템 권한창을 한 번 거절하면 다시 못 띄우므로, 이 안내에서 "알림 받기"를 누른 사람에게만 시스템 창을 띄운다.
// push.ts 가 utils/pushPrePrompt.askPushPermission() 으로 호출 → 사용자가 고르면 true/false 로 풀림.
export default function PushPrePrompt() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { bindPushPrePrompt(setVisible); return () => bindPushPrePrompt(null); }, []);
  const answer = (ok: boolean) => { setVisible(false); answerPushPrePrompt(ok); };
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[210] bg-black/60 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="알림 안내">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <p className="text-lg font-bold text-gray-900">알림을 받아 보시겠어요?</p>
        <p className="text-sm text-gray-700 mt-3 leading-relaxed">
          채팅 메시지, 내 글의 댓글·답글, 예약·문의 답변처럼 <b>꼭 필요한 것만</b> 알려드려요.
        </p>
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">의미 없는 광고 알림은 보내지 않아요.</p>
        <p className="text-[11px] text-gray-400 mt-3">알림은 MY → 설정에서 언제든 끌 수 있어요.</p>
        <button type="button" onClick={() => answer(true)} className="mt-5 w-full min-h-12 rounded-xl bg-gray-900 text-white text-sm font-bold">알림 받기</button>
        <button type="button" onClick={() => answer(false)} className="mt-2 w-full min-h-10 text-xs text-gray-500">나중에</button>
      </div>
    </div>
  );
}
