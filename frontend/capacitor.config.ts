import type { CapacitorConfig } from '@capacitor/cli';

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
};

export default config;
