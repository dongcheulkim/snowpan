import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 새 배포 후 옛 chunk 파일이 사라져 dynamic import 가 실패하면
// 한 번에 한해 강제 새로고침 (무한루프 방지 위해 sessionStorage 가드).
const CHUNK_ERR_RE = /(ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed)/i;
function handleStaleChunk(reason: unknown) {
  const msg = String((reason as { message?: string })?.message ?? reason ?? '');
  if (!CHUNK_ERR_RE.test(msg)) return false;
  if (sessionStorage.getItem('chunkReloaded') === '1') return false; // 이미 시도함
  sessionStorage.setItem('chunkReloaded', '1');
  // SW 까지 정리해 새 빌드 보장
  if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  }
  setTimeout(() => window.location.reload(), 50);
  return true;
}
window.addEventListener('error', e => { handleStaleChunk(e.error || e.message); });
window.addEventListener('unhandledrejection', e => { handleStaleChunk(e.reason); });

// 오래된 캐시 강제 삭제 (API + workbox precache 둘 다).
// 과거 배포에 섞여 stale 로고 chunk 가 서빙되는 버그 방지.
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (
        name.includes('product-cache') ||
        name.includes('api-cache') ||
        name.includes('banner-cache') ||
        name.startsWith('workbox-precache') // 구 precache 전체 비움
      ) {
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
// 형식이 깨진 DSN 으로 init 하면 console 에 'Invalid Sentry Dsn' 빨갛게 뜨므로 사전 검증.
const VALID_DSN = /^https?:\/\/[^@]+@[^/]+\/\d+/;
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn && VALID_DSN.test(dsn)) {
    // .catch() 필수 — Safari 등 특정 브라우저에서 dynamic import 실패 시
    // unhandled promise rejection 으로 Sentry 가 자기 자신 로드 실패를 보고하는
    // 무한 루프 방지.
    import('@sentry/react').then((S) => {
      // 5,000 DAU 시즌 피크 기준 Sentry quota 보호:
      // 10% traces × 5,000명 × 20 PV = 10K traces/day = ~300K/month → 무료 quota (5K/month) 폭주.
      // production 2% (~60K/month, Team 플랜 $26 한도 내), dev 100% (디버깅 편의).
      // 에러는 항상 100% 캡처 — quota 영향 크지 않음.
      S.init({
        dsn,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_RELEASE || undefined,
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.02 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // 서드파티 스크립트 잡음 / 브라우저 확장 에러 필터 + Sentry 자체 모듈 로드 실패 무시
          const msg = event.message || event.exception?.values?.[0]?.value || '';
          if (/ResizeObserver|Non-Error promise rejection|@sentry\/react.*does not resolve/i.test(msg)) return null;
          return event;
        },
      });
      // 로그인 시 user context 자동 태깅
      try {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          S.setUser({ id: u.id, email: u.email, username: u.nickname || u.name });
        }
      } catch { /* ignore */ }
    }).catch(() => { /* Sentry 로드 실패는 silent — 앱 동작에 영향 없음 */ });
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 첫 로딩 스플래시 제거 — React 마운트 후 최소 노출시간(400ms) 보장하고 페이드아웃.
// 너무 빨리 사라지면 깜빡임처럼 보여서 최소 시간을 둠.
(() => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  const start = performance.now();
  const MIN_MS = 400;
  requestAnimationFrame(() => {
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 500);
    }, wait);
  });
})();
