import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// 한국 개인정보보호법 (PIPA) — 쿠키 사용 시 정보 제공 의무.
// 분석 도구 (GA 등) 활성화 전 사용자 동의를 받기 위한 배너.
// 필수 쿠키는 동의 없이도 동작 (세션, 인증) — 분석/광고만 게이트.

const STORAGE_KEY = 'cookie-consent-v1';
type Consent = 'all' | 'essential' | null;

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

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) {
      // 첫 방문에 즉시 띄우면 LCP 영향 — 1초 지연
      const t = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!open) return null;

  const accept = (v: Consent) => {
    setCookieConsent(v);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="fixed bottom-0 left-0 right-0 z-[60] md:left-4 md:right-4 md:bottom-4 md:max-w-lg md:mx-auto"
    >
      <div className="bg-white border-t border-gray-200 md:border md:rounded-2xl shadow-2xl px-5 py-4">
        <h2 id="cookie-title" className="text-sm font-bold text-gray-900 mb-1">
          쿠키 사용 안내
        </h2>
        <p id="cookie-desc" className="text-xs text-gray-600 leading-relaxed mb-3">
          스노우판은 서비스 운영에 꼭 필요한 <strong>필수 쿠키</strong>와 사용성 개선을 위한 <strong>분석 쿠키</strong>를 사용합니다.
          분석 쿠키는 거부하실 수 있으며, 자세한 내용은{' '}
          <Link to="/privacy" className="text-sky-600 underline">개인정보처리방침</Link>에서 확인하실 수 있습니다.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => accept('essential')}
            className="flex-1 min-h-11 px-3 py-2 text-xs font-bold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            필수만 허용
          </button>
          <button
            onClick={() => accept('all')}
            className="flex-1 min-h-11 px-3 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            전체 동의
          </button>
        </div>
      </div>
    </div>
  );
}
