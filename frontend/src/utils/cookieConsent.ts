// 쿠키 동의 저장·조회 — 배너(components/CookieConsent.tsx)와 분석 도구(utils/analytics.ts)가 같이 쓴다.
export const STORAGE_KEY = 'cookie-consent-v1';
export type Consent = 'all' | 'essential' | null;

export function getCookieConsent(): Consent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'all' || v === 'essential') return v;
  } catch { /* private mode */ }
  return null;
}

export function setCookieConsent(v: Consent) {
  if (!v) return;
  try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
  // 동의 후 분석 도구 초기화는 main.tsx 의 옵저버 또는 GA 모듈에서 감지.
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: v }));
}
