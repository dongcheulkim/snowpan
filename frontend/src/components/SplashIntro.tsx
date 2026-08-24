import { useEffect, useState } from 'react';

// 콜드 스타트 스플래시 — SNOW PAN 워드마크 리빌 후 홈으로 페이드.
// 세션당 1회만 (라우팅·새로고침 반복 노출 방지). 앱은 네이티브 스플래시(흰 배경)에서
// 같은 흰 배경으로 이어받아 하나의 인트로처럼 보인다.
const KEY = 'snowpan.introShown';

export default function SplashIntro() {
  const [phase, setPhase] = useState<'show' | 'exit' | 'done'>(() => {
    try { return sessionStorage.getItem(KEY) ? 'done' : 'show'; } catch { return 'done'; }
  });

  useEffect(() => {
    if (phase !== 'show') return;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* 무시 */ }
    // 동작 줄이기 설정이면 거의 바로 사라짐
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setPhase('exit'), reduced ? 200 : 1050);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const t = setTimeout(() => setPhase('done'), 480);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[90] bg-white flex items-center justify-center transition-opacity duration-[480ms] ease-out ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <img
        src="/snowpan-wordmark.svg"
        alt=""
        draggable={false}
        className="splash-logo select-none"
        style={{ height: '34px', width: 'auto' }}
      />
    </div>
  );
}
