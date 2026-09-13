import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

// 스노우판 앱 (Capacitor). dist(Vite 빌드)를 앱에 번들 — 데이터는 API 로 실시간 반영.
// 화면 코드 변경 시 `npm run build && npx cap sync` 후 재빌드/제출.
const config: CapacitorConfig = {
  appId: 'kr.snowpan.app',
  appName: '스노우판',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  android: {
    // 릴리즈 빌드는 https 만 — 평문 http 차단(보안).
    allowMixedContent: false,
  },
  plugins: {
    // 네이티브 스플래시(흰 배경)를 짧게 → 웹 스플래시(워드마크 리빌)가 이어받아
    // 하나의 인트로처럼 보이게. 오래 잡고 있으면 이중 대기처럼 느껴짐.
    SplashScreen: {
      backgroundColor: '#ffffff',
      launchShowDuration: 600,
      launchAutoHide: true,
    },
    // iOS: 앱이 켜져 있을 때도 알림 배너·소리 표시
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // iOS: 웹뷰를 플러그인이 줄이면 키보드 애니메이션이 끝나고 0.2초 뒤에야 줄어들어 느리고 채팅이 중간에 걸림(사장님 신고 2026-09-13).
    // → 웹뷰는 그대로 두고(None) keyboardWillShow 의 높이로 채팅방 자체를 즉시 같이 올린다(native.ts --kb + .chat-root). 안드로이드는 이 값과 무관(adjustResize).
    Keyboard: {
      resize: KeyboardResize.None,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
