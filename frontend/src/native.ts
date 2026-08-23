// Capacitor 네이티브(앱) 전용 초기화. 웹 브라우저에서는 아무것도 하지 않음.
import { Capacitor } from '@capacitor/core';

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ]);

    // 상태바 — 밝은 배경 + 어두운 아이콘, 웹뷰 위에 겹치지 않게(내용이 상태바 아래에서 시작)
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {}); // 구버전 안드로이드: 상태바 아래로 내용 밀기
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {}); // 상태바 배경 흰색(앱과 통일)

    // 안드로이드 하드웨어 뒤로가기 — 히스토리 있으면 뒤로, 없으면 앱 종료
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // 소셜 로그인 딥링크 수신 — 백엔드가 kr.snowpan.app://oauth/callback#token=... (또는 login?social_error=) 로 되돌림.
    // 인앱 브라우저 닫고, 웹뷰를 해당 경로로 이동 → 기존 OAuthCallback/Login 이 처리.
    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith('kr.snowpan.app://')) return;
      try { const { Browser } = await import('@capacitor/browser'); await Browser.close().catch(() => {}); } catch { /* ignore */ }
      const rest = url.slice('kr.snowpan.app://'.length); // "oauth/callback#..." 또는 "login?..."
      if (rest.startsWith('oauth/callback')) {
        const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
        window.location.href = '/oauth/callback' + hash;
      } else if (rest.startsWith('login')) {
        const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
        window.location.href = '/login' + query;
      }
    });

    // 첫 화면 렌더 후 스플래시 숨김
    setTimeout(() => { SplashScreen.hide().catch(() => {}); }, 200);

    // 이미 로그인된 상태면(지속 로그인 복원) FCM 푸시 등록.
    const { initPush } = await import('./push');
    initPush().catch(() => {});
  } catch { /* 플러그인 로드 실패 시 무시(웹 동작엔 영향 없음) */ }
}
