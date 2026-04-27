import { useEffect, useState } from 'react';
import {
  shouldShowPushPrompt,
  requestPushPermission,
  dismissPushPrompt,
} from '../utils/pushNotification';
import { getUser } from '../api';

// 로그인 사용자에게만, 권한 default 일 때만 1회 노출.
// 거절/닫기 시 7일 쿨다운.
export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getUser()) return;
    const timer = setTimeout(() => {
      if (shouldShowPushPrompt()) setVisible(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleAllow = async () => {
    await requestPushPermission();
    dismissPushPrompt();
    setVisible(false);
  };

  const handleDismiss = () => {
    dismissPushPrompt();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="알림 권한 요청"
      className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[60] w-[calc(100%-1.5rem)] max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4 animate-fade-in-up"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7v3.586l-1.707 1.707A1 1 0 0 0 4 16h16a1 1 0 0 0 .707-1.707L19 12.586V9a7 7 0 0 0-7-7zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">알림 받기</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            새 메시지·문의가 오면 바로 알려드릴게요.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAllow}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
            >
              허용
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
