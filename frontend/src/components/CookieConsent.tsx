import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isNativeApp } from '../api';
import { getCookieConsent, setCookieConsent, type Consent } from '../utils/cookieConsent';

// 한국 개인정보보호법 (PIPA) — 쿠키 사용 시 정보 제공 의무.
// 분석 도구 (GA 등) 활성화 전 사용자 동의를 받기 위한 배너.
// 필수 쿠키는 동의 없이도 동작 (세션, 인증) — 분석/광고만 게이트.
// 네이티브 앱(iOS/Android)에서는 표시하지 않음 — 앱은 분석 도구를 아예 안 쓰고, 애플 5.1.2(i)가 쿠키 안내를 '추적'으로 봄 (2026-09-15 반려).


export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
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
      className="fixed left-0 right-0 z-[45] bottom-[calc(4rem+env(safe-area-inset-bottom))] md:left-4 md:right-4 md:bottom-4 md:max-w-lg md:mx-auto"
    >
      {/* 컴팩트 한 줄 배너 — 화면 점유 최소화. 안내 문구 1줄 + 인라인 버튼 */}
      <div className="bg-white border-t border-gray-200 md:border md:rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3">
        <p id="cookie-desc" className="flex-1 text-[11px] text-gray-600 leading-tight">
          <span id="cookie-title" className="font-bold text-gray-900">쿠키 사용 안내</span> · 로그인 유지와 방문 통계에만 쓰고 광고 추적에는 쓰지 않아요.{' '}
          <Link to="/privacy" aria-label="개인정보처리방침 자세히 보기" className="text-sky-600 underline">자세히</Link>
        </p>
        <button
          onClick={() => accept('essential')}
          className="flex-shrink-0 min-h-9 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 rounded-lg hover:bg-gray-50"
        >
          필수만
        </button>
        <button
          onClick={() => accept('all')}
          className="flex-shrink-0 min-h-9 px-3.5 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          동의
        </button>
      </div>
    </div>
  );
}
