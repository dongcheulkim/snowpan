import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isNativeApp } from '../api';
import { getPushState, enablePushNow, openNotificationSettings, type PushState } from '../push';
import { toastError, toastSuccess } from '../utils/toast';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/appLinks';

// MY → 알림 설정 (2026-10-10, 사장님 "알림 한 번 설정 안 하면 다시 설정하는 화면이 없다").
// 앱: 권한 상태를 보여 주고, 아직 안 물어봤으면 바로 켜기, 거절했으면 폰 설정으로 보내기. 앱으로 돌아오면 상태를 다시 읽는다.
// 웹: 푸시는 앱에서만 되니 설치 안내. 키워드 알림·찜한 매장 알림은 여기서도 바로 이동.
export default function NotificationSettings() {
  const native = isNativeApp();
  const [state, setState] = useState<PushState | 'checking'>('checking');
  const [busy, setBusy] = useState(false);

  const refresh = async () => setState(await getPushState());
  useEffect(() => {
    refresh();
    // 폰 설정에서 켜고 돌아오면 바로 반영
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const next = await enablePushNow();
      setState(next);
      if (next === 'granted') toastSuccess('알림을 켰어요. 채팅·댓글·예약 답변을 바로 알려 드려요.');
      else if (next === 'denied') toastError('폰 설정에서 알림이 꺼져 있어요. 아래 버튼으로 설정을 열어 허용해 주세요.');
    } finally { setBusy(false); }
  };
  const openSettings = async () => {
    const ok = await openNotificationSettings();
    if (!ok) toastError('설정을 열지 못했어요. 폰 설정 → 앱 → 스노우판 → 알림에서 허용해 주세요.');
  };

  const label = state === 'granted' ? '켜짐' : state === 'denied' ? '꺼짐 (폰 설정에서 차단)' : state === 'prompt' ? '아직 설정 안 함' : state === 'checking' ? '확인 중' : '앱에서만 설정';

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">알림 설정</h1>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">앱 알림</h2>
            <p className="text-xs text-gray-500 mt-1">채팅 메시지, 내 글의 댓글·답글, 예약·문의 답변, 거래 약속 알림. 광고 알림은 보내지 않아요.</p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${state === 'granted' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`} role="status">{label}</span>
        </div>

        {native ? (
          <div className="mt-4 space-y-2">
            {state === 'prompt' && (
              <button type="button" onClick={enable} disabled={busy} className="w-full min-h-12 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-60">알림 켜기</button>
            )}
            {state === 'denied' && (
              <>
                <p className="text-xs text-gray-600 leading-relaxed">전에 알림을 허용하지 않아서 폰 설정에서 꺼져 있어요. 설정을 열어 <b>알림 허용</b>을 켜고 앱으로 돌아오면 바로 적용돼요.</p>
                <button type="button" onClick={openSettings} className="w-full min-h-12 rounded-xl bg-gray-900 text-white text-sm font-bold">폰 설정 열기</button>
              </>
            )}
            {state === 'granted' && (
              <>
                <p className="text-xs text-gray-600">알림을 끄려면 폰 설정에서 끌 수 있어요.</p>
                <button type="button" onClick={openSettings} className="w-full min-h-11 rounded-xl border border-gray-300 text-gray-800 text-sm font-bold">폰 설정 열기</button>
              </>
            )}
            {state === 'unavailable' && <p className="text-xs text-gray-600">이 기기에서는 알림을 설정할 수 없어요.</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-600 leading-relaxed">푸시 알림은 스노우판 앱에서만 받을 수 있어요. 앱을 설치하고 로그인하면 알림 설정을 물어봐요.</p>
            <div className="flex gap-2">
              {APP_STORE_URL && <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-11 rounded-xl bg-gray-900 text-white text-xs font-bold flex items-center justify-center">App Store</a>}
              {PLAY_STORE_URL && <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-11 rounded-xl border border-gray-300 text-gray-800 text-xs font-bold flex items-center justify-center">Google Play</a>}
            </div>
          </div>
        )}
      </div>

      <div className="card divide-y divide-gray-100">
        <Link to="/mypage/keywords" className="flex items-center justify-between px-5 py-4">
          <div><p className="text-sm font-bold text-gray-900">키워드 알림</p><p className="text-xs text-gray-500 mt-0.5">원하는 중고 매물이 올라오면 알려 드려요</p></div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link to="/mypage/shop-follows" className="flex items-center justify-between px-5 py-4">
          <div><p className="text-sm font-bold text-gray-900">찜한 매장 알림</p><p className="text-xs text-gray-500 mt-0.5">찜한 매장의 소식·이벤트를 알려 드려요</p></div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>
    </div>
  );
}
