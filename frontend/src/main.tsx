import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 오래된 API 캐시 강제 삭제 (v2 이전 버전 유저용)
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('product-cache') || name.includes('api-cache') || name.includes('banner-cache')) {
        caches.delete(name);
      }
    });
  }).catch(() => {});
}

// 서비스워커 업데이트 강제
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.update().catch(() => {}));
  }).catch(() => {});
}

// Sentry (VITE_SENTRY_DSN 설정 시 활성화)
// Vercel env에 VITE_SENTRY_DSN을 세팅하면 자동으로 활성화됩니다.
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    import('@sentry/react').then(S => {
      S.init({
        dsn,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_RELEASE || undefined,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // 서드파티 스크립트 잡음 / 브라우저 확장 에러 필터
          const msg = event.message || event.exception?.values?.[0]?.value || '';
          if (/ResizeObserver|Non-Error promise rejection/.test(msg)) return null;
          return event;
        },
      });
      // 로그인 시 user context 자동 태깅
      try {
        const raw = sessionStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          S.setUser({ id: u.id, email: u.email, username: u.nickname || u.name });
        }
      } catch { /* ignore */ }
    });
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
