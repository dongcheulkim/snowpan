import { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { restoreSession } from '../api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import ToastHost from '../components/Toast';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import ReviewPromptModal from '../components/ReviewPromptModal';
import CookieConsent from '../components/CookieConsent';
import InstallPrompt from '../components/InstallPrompt';
import PullToRefresh from '../components/PullToRefresh';
import { setupAnalytics, trackPageView } from '../utils/analytics';
import { SITE_URL } from '../config/site';

// 앱 우선 — 모든 페이지가 phone-width (max-w-md, ~448px) 로 중앙 정렬.
// 데스크탑에선 양 옆에 빈 영역, 모바일에선 전체 폭. 추후 native app 으로 래핑 시
// 같은 UI 그대로 동작.

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.removeItem('theme');
    }
  }, []);

  useEffect(() => { restoreSession(); }, []);
  useEffect(() => { setupAnalytics(); }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // 라우트 변경 시 스크롤 최상단 — 목록에서 스크롤 후 상세 진입 시 중간부터
  // 보이던 문제 해결. (같은 경로 내 쿼리 변경은 유지)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = 'canonical';
      document.head.appendChild(el);
    }
    el.href = `${SITE_URL}${location.pathname}`;
  }, [location.pathname]);

  // SNOWPAN 단일 운영 — 모든 페이지에서 Navbar/BottomNav 노출.
  void location;
  const showAppChrome = true;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      {/* 앱 컨테이너 — 데스크탑에선 phone-width 중앙 정렬, 모바일에선 전체 폭 */}
      <div className="relative w-full max-w-md bg-snow flex flex-col min-h-screen shadow-xl">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
          본문 바로가기
        </a>
        {showAppChrome && (
          <header>
            <Navbar />
          </header>
        )}
        <main id="main-content" className="flex-1 w-full px-4 py-4 pb-24">
          <Outlet />
          {/* 푸터 — 링크만 (사업자 정보 상시 표시는 토스 심사용이었고 심사 거절로 접음. 사업자정보는 /about 에 유지: 전자상거래법 표시는 링크 도달로 충족) */}
          <footer className="mt-10 pt-5 border-t border-gray-200 text-[11px] leading-relaxed text-gray-400">
            <p>
              <Link to="/about" className="underline underline-offset-2 hover:text-gray-600">사업자정보</Link>
              <span className="mx-1.5">·</span>
              <Link to="/advertise" className="underline underline-offset-2 hover:text-gray-600">광고안내</Link> · <Link to="/partners" className="underline underline-offset-2 hover:text-gray-600">입점안내</Link>
              <span className="mx-1.5">·</span>
              <Link to="/help" className="underline underline-offset-2 hover:text-gray-600">고객센터</Link>
            </p>
            <p className="mt-2 text-gray-300">스노우판은 통신판매중개자로서 거래 당사자가 아니며, 회원 간 거래 정보·상품의 책임은 판매자에게 있습니다.</p>
            <p className="text-gray-300">© 2026 스노우판</p>
          </footer>
        </main>
        {showAppChrome && <BottomNav />}
        <ToastHost />
        <PushPermissionPrompt />
        <ReviewPromptModal />
        <CookieConsent />
        <InstallPrompt />
        <PullToRefresh />
      </div>
    </div>
  );
};

export default MainLayout;
