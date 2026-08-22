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

    // 상태바 — 밝은 배경 + 어두운 아이콘
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});

    // 안드로이드 하드웨어 뒤로가기 — 히스토리 있으면 뒤로, 없으면 앱 종료
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // 첫 화면 렌더 후 스플래시 숨김
    setTimeout(() => { SplashScreen.hide().catch(() => {}); }, 200);
  } catch { /* 플러그인 로드 실패 시 무시(웹 동작엔 영향 없음) */ }
}
