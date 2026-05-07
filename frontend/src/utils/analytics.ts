// GA4 분석 — 쿠키 동의 ('all') 받은 후에만 로드. 'essential' 만 동의하면 비활성.
// VITE_GA_MEASUREMENT_ID 가 설정되어 있어야 작동.
//
// 사용법: main.tsx 에서 setupAnalytics() 한 번 호출.
// 페이지뷰는 React Router 변경 감지로 자동 트래킹 (initAnalyticsRouter 훅).

import { getCookieConsent } from '../components/CookieConsent';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
let loaded = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGA() {
  if (loaded || !MEASUREMENT_ID) return;
  loaded = true;
  // gtag.js 비동기 로드
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) { window.dataLayer!.push(args); }
  window.gtag = gtag;
  gtag('js', new Date());
  // anonymize_ip 는 GA4 에서 deprecated; GA4 는 기본적으로 IP 마지막 옥텟 마스킹
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false, // SPA 라우팅 따라 수동 발송
  });
}

export function setupAnalytics() {
  if (!MEASUREMENT_ID) return;
  // 동의 이미 받았으면 즉시 로드
  if (getCookieConsent() === 'all') {
    loadGA();
  }
  // 동의 변경 이벤트 감지
  window.addEventListener('cookie-consent-changed', (e) => {
    const consent = (e as CustomEvent<string>).detail;
    if (consent === 'all') loadGA();
  });
}

export function trackPageView(path: string, title?: string) {
  if (!loaded || !window.gtag || !MEASUREMENT_ID) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!loaded || !window.gtag) return;
  window.gtag('event', name, params || {});
}
