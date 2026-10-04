import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isNativeApp } from '../api';
import { getCookieConsent } from '../utils/cookieConsent';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/appLinks';

// 모바일 웹 방문자에게 앱 안내 (2026-10-04, 사장님 "웹으로 들어가면 앱 나왔다고 알리고 앱으로 연결").
// 예전 '홈 화면에 추가'(PWA 설치) 안내(InstallPrompt)를 대체 — 진짜 앱이 나왔으니 스토어로 보냄.
// 화면을 덮지 않는 아래쪽 작은 카드 — 전면 팝업은 검색 순위에 불리하고 링크 타고 온 사람을 막아서 쓰지 않음.
// PC·앱 안에서는 안 뜸. "웹으로 계속 보기" 를 누르면 7일 동안 안 뜸. 쿠키 안내가 떠 있는 동안은 기다림(겹침 방지).
const KEY = 'snowpan.appCardDismissed';
const HIDE_MS = 7 * 24 * 60 * 60 * 1000;

function mobilePlatform(): 'ios' | 'android' | null {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return null;
}

export default function AppInstallCard() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const platform = mobilePlatform();

  useEffect(() => {
    if (isNativeApp() || !platform) return;
    try { const at = Number(localStorage.getItem(KEY) || 0); if (at && Date.now() - at < HIDE_MS) return; } catch { /* ignore */ }
    // 쿠키 안내에 답한 뒤(또는 이미 답한 상태)에만, 첫 화면이 그려지고 2.5초 뒤
    let timer: ReturnType<typeof setTimeout>;
    const tryOpen = () => { if (getCookieConsent() === null) { timer = setTimeout(tryOpen, 1500); return; } setOpen(true); };
    timer = setTimeout(tryOpen, 2500);
    return () => clearTimeout(timer);
  }, [platform]);

  if (!open || !platform) return null;
  if (pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/chat/')) return null; // 입력·관리 화면은 가리지 않음
  const url = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  if (!url) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } setOpen(false); };

  return (
    <div role="complementary" aria-label="앱 안내" className="fixed left-3 right-3 z-[44] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="bg-gray-900 text-white rounded-2xl shadow-lg px-4 py-3.5">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl flex-shrink-0 bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">스노우판 앱이 나왔어요</p>
            <p className="text-[11px] text-white/70 mt-0.5">채팅·댓글 알림을 바로 받고, 더 빠르게 볼 수 있어요.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={dismiss} className="flex-1 min-h-10 rounded-lg border border-white/30 text-xs text-white/80">웹으로 계속 보기</button>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={dismiss} className="flex-1 min-h-10 rounded-lg bg-white text-gray-900 text-xs font-bold flex items-center justify-center">앱으로 열기</a>
        </div>
      </div>
    </div>
  );
}
