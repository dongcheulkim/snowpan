import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

  useEffect(() => {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = 'canonical';
      document.head.appendChild(el);
    }
    el.href = `${SITE_URL}${location.pathname}`;
  }, [location.pathname]);

  // 네비/BottomNav 노출 조건 — PAN 허브와 5종목 Coming Soon 페이지에서 숨김.
  // 미출시 vertical (bike/run/surf/golf/camp) 은 ComingSoon 자체 헤더만 사용.
  const isPanHub = location.pathname === '/' || location.pathname === '/pan';
  const firstSeg = (location.pathname.split('/')[1] || '').toLowerCase();
  const isComingSoon = ['bike', 'run', 'surf', 'golf', 'camp'].includes(firstSeg);
  const showAppChrome = !isPanHub && !isComingSoon;

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
