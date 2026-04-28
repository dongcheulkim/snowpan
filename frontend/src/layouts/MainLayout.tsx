import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import ToastHost from '../components/Toast';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import ReviewPromptModal from '../components/ReviewPromptModal';

const SITE_URL = 'https://snowpan.vercel.app';

const MainLayout = () => {
  const location = useLocation();

  // 다크모드 잔여 정리 — 이전 사용자가 'dark' 로 저장해뒀을 수 있어
  // 한 번 더 확실히 제거.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    if (localStorage.getItem('theme') === 'dark') {
      localStorage.removeItem('theme');
    }
  }, []);

  // 모든 페이지에 canonical link 자동 설정 — useMeta 미사용 페이지 포함.
  // 쿼리 파라미터는 제외해서 같은 페이지의 중복 색인 방지.
  useEffect(() => {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = 'canonical';
      document.head.appendChild(el);
    }
    el.href = `${SITE_URL}${location.pathname}`;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-snow flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
        본문 바로가기
      </a>
      <header>
        <Navbar />
      </header>
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-12 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <footer className="hidden md:block border-t border-gray-200 bg-snow">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-8 text-xs text-gray-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-bold text-gray-700">SNOW PAN</p>
            <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-2 gap-y-1 -mx-2">
              <Link to="/terms" className="inline-flex items-center min-h-11 px-2 hover:text-gray-900">이용약관</Link>
              <Link to="/privacy" className="inline-flex items-center min-h-11 px-2 hover:text-gray-900">개인정보처리방침</Link>
              <Link to="/safe-trade" className="inline-flex items-center min-h-11 px-2 hover:text-gray-900">안전거래 가이드</Link>
              <Link to="/mypage/support" className="inline-flex items-center min-h-11 px-2 hover:text-gray-900">고객센터</Link>
            </nav>
          </div>
          <p className="mt-4 leading-relaxed text-gray-500">
            © {new Date().getFullYear()} 스노우판 · 본 서비스는 통신판매중개자로서 거래 당사자가 아니며, 회원 간 거래에 대한 책임을 지지 않습니다.
          </p>
        </div>
      </footer>
      <BottomNav />
      <ToastHost />
      <PushPermissionPrompt />
      <ReviewPromptModal />
    </div>
  );
};

export default MainLayout;
