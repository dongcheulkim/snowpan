import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getUser, isNativeApp } from '../api';
import { getCookieConsent } from '../utils/cookieConsent';

// PC 웹 방문자에게 앱 안내 팝업 — 폰 카메라로 QR 을 찍으면 스토어로 (2026-10-08 사장님 요청).
// 폰 웹은 AppInstallCard(아래쪽 작은 카드)가 맡고, 여기는 1024px 이상에서만.
// 닫기만 누르면 이번 접속(탭)에서만 숨김, "다시 보지 않기"를 체크하면 그 계정(비로그인은 이 브라우저)에서 영구 숨김.
const SESSION_KEY = 'snowpan.pcQrSeen';
const neverKey = () => `snowpan.pcQrNever:${getUser()?.id || 'guest'}`;

export default function PcAppQrPrompt() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [never, setNever] = useState(false);
  const userId = getUser()?.id;

  useEffect(() => {
    if (isNativeApp()) return;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      if (localStorage.getItem(neverKey())) return;
    } catch { /* 저장소 못 쓰면 그냥 보여준다 */ }
    // 쿠키 안내에 답한 뒤, 첫 화면이 그려지고 2초 뒤
    let timer: ReturnType<typeof setTimeout>;
    const tryOpen = () => { if (getCookieConsent() === null) { timer = setTimeout(tryOpen, 1500); return; } setOpen(true); };
    timer = setTimeout(tryOpen, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!open) return null;
  // 입력·관리·앱 안내 화면은 가리지 않음
  if (/^\/(admin|login|register|chat\/|app$|oauth|mypage\/shops|[^/]+\/register|[^/]+\/[^/]+\/edit)/.test(pathname)) return null;

  const close = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
      if (never) localStorage.setItem(neverKey(), String(Date.now()));
    } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pc-qr-title" className="fixed inset-0 z-[60] hidden lg:flex items-center justify-center bg-black/40 p-6" onClick={close}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
        <img src="/snowpan-wordmark.svg" alt="SNOW PAN" className="h-5 w-auto" draggable={false} />
        <h2 id="pc-qr-title" className="text-xl font-bold text-gray-900 mt-5">스노우판 앱으로 보세요</h2>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">채팅·댓글 알림을 바로 받고, 광고 보고 끌어올리기도 앱에서만 돼요.</p>
        <div className="flex items-center gap-5 mt-5 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <img src="/icons/qr-app.svg" alt="스노우판 앱 받기 QR" className="w-32 h-32 flex-shrink-0 rounded-lg bg-white border border-gray-200" />
          <div className="text-sm text-gray-800 leading-relaxed">
            <p className="font-bold text-gray-900">폰 카메라로 QR을 찍으세요</p>
            <p className="mt-1 text-gray-600">아이폰·안드로이드 모두 설치 화면으로 바로 이동해요.</p>
            <p className="mt-2 text-xs text-gray-500">주소로 가기: snowpan.kr/app</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-5">
          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="w-4 h-4 accent-gray-900" />
            다시 보지 않기
          </label>
          <button type="button" onClick={close} className="min-h-11 px-5 rounded-lg bg-gray-900 text-white text-sm font-bold">닫기</button>
        </div>
      </div>
    </div>
  );
}
