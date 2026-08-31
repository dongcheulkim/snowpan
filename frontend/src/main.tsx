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

  // 새 SW 가 제어권을 잡는 순간 1회 자동 리로드 — 배포 직후 "새로고침 두 번" 없이 바로 최신 화면.
  // 첫 설치(controller 없음 → 생김) 때는 리로드하지 않음 (첫 방문 무한 리로드 방지).
  let hadController = !!navigator.serviceWorker.controller;
  let swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (swReloaded) return;
    // 병리적 상황(CDN 이 구/신 sw 를 번갈아 서빙) 대비 — 10분 내 3회 초과 자동 리로드 금지
    try {
      let log: number[] = [];
      try {
        const parsed = JSON.parse(sessionStorage.getItem('snowpan.swReloadLog') || '[]');
        if (Array.isArray(parsed)) log = parsed.filter((t) => typeof t === 'number');
      } catch { /* corrupt — 빈 로그로 리셋 */ }
      log = log.filter((t) => Date.now() - t < 10 * 60 * 1000);
      if (log.length >= 3) return; // 캡 초과 — 리로드 중단 (fail-closed)
      log.push(Date.now());
      sessionStorage.setItem('snowpan.swReloadLog', JSON.stringify(log));
    } catch { return; /* 스토리지 자체 불가 — 리로드 포기가 안전 */ }
    swReloaded = true;
    // 자동 리로드 직후엔 스플래시 스킵 표시 (인트로 2연속 방지)
    try { sessionStorage.setItem('snowpan.swReload', '1'); } catch { /* 무시 */ }
    window.location.reload();
  });

  // 탭을 오래 열어둔 사용자도 다시 볼 때 새 버전 감지
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.update().catch(() => {}));
    }).catch(() => {});
  });
}

// Sentry (VITE_SENTRY_DSN 설정 시 활성화)
// Vercel env에 VITE_SENTRY_DSN을 세팅하면 자동으로 활성화됩니다.
// 형식이 깨진 DSN 으로 init 하면 console 에 'Invalid Sentry Dsn' 빨갛게 뜨므로 사전 검증.
const VALID_DSN = /^https?:\/\/[^@]+@[^/]+\/\d+/;
// 초기 로딩과 대역폭 경쟁하지 않도록 load 이후 유휴 시간에 로드 (모바일 LCP 보호).
function whenIdleAfterLoad(fn: () => void) {
  const idle = () => {
    if ('requestIdleCallback' in window) (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(fn, { timeout: 5000 });
    else setTimeout(fn, 2500);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn && VALID_DSN.test(dsn)) {
    whenIdleAfterLoad(() => {
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
    });
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Capacitor 네이티브(앱) 초기화 — 웹에선 no-op.
import('./native').then(m => m.initNative()).catch(() => {});

// 첫 로딩 스플래시(index.html 워드마크 리빌) 제거 — 매 페이지 로드마다 연출.
// 단 SW 업데이트로 인한 자동 리로드 직후엔 스킵 (배포 직후 스플래시 2연속 방지).
(() => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  let swReloaded = false;
  try {
    swReloaded = sessionStorage.getItem('snowpan.swReload') === '1';
    sessionStorage.removeItem('snowpan.swReload');
  } catch { /* 무시 */ }
  if (swReloaded) { splash.remove(); return; }
  const start = performance.now();
  const MIN_MS = 1850; // 로고 리빌(1.1s) + 샤인·빔 스윕까지
  requestAnimationFrame(() => {
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 480);
    }, wait);
  });
})();
