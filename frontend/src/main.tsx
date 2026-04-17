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
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    // @ts-ignore
    import('@sentry/react').then(S => S.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0.1 }));
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
