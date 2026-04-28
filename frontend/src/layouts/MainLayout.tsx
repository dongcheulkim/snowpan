import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import ToastHost from '../components/Toast';
import PushPermissionPrompt from '../components/PushPermissionPrompt';
import ReviewPromptModal from '../components/ReviewPromptModal';

const MainLayout = () => {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
        본문 바로가기
      </a>
      <Navbar />
      <main id="main-content" className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      <ToastHost />
      <PushPermissionPrompt />
      <ReviewPromptModal />
    </div>
  );
};

export default MainLayout;
