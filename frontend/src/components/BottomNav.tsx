import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUser } from '../api';

// 소프트 키보드 감지: Visual Viewport API 로 키보드 올라올 때 BottomNav 숨김.
// iOS Safari / Android Chrome 둘 다 지원. 입력 폼 (Chat, UsedRegister, CommunityWrite 등) 에서
// 키보드가 네비를 덮는 문제 해결.
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    const handle = () => {
      // 뷰포트 높이가 윈도우 대비 75% 미만이면 키보드가 올라온 것으로 간주.
      // iOS 에서 visualViewport.height 는 키보드 높이만큼 줄어듦.
      const isOpen = vv.height < window.innerHeight * 0.75;
      setOpen(isOpen);
    };

    vv.addEventListener('resize', handle);
    vv.addEventListener('scroll', handle);
    return () => {
      vv.removeEventListener('resize', handle);
      vv.removeEventListener('scroll', handle);
    };
  }, []);

  return open;
}

const BottomNav = () => {
  const location = useLocation();
  const user = getUser();
  const path = location.pathname;
  const keyboardOpen = useKeyboardOpen();

  if (path.startsWith('/chat/') && path !== '/chat/rooms') return null;

  const items = [
    {
      label: '홈', path: '/',
      icon: (a: boolean) => <svg className="w-6 h-6" fill={a ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    },
    {
      label: '커뮤니티', path: '/community',
      icon: (a: boolean) => <svg className="w-6 h-6" fill={a ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>,
    },
    {
      label: '채팅', path: '/chat/rooms',
      icon: (a: boolean) => <svg className="w-6 h-6" fill={a ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    {
      label: 'MY', path: user ? '/mypage' : '/login',
      icon: (a: boolean) => <svg className="w-6 h-6" fill={a ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
  ];

  return (
    <nav
      aria-label="주요 메뉴"
      aria-hidden={keyboardOpen}
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-bottom transition-transform duration-200 ${
        keyboardOpen ? 'translate-y-full pointer-events-none' : 'translate-y-0'
      }`}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const active = item.path === '/' ? path === '/' : path.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              tabIndex={keyboardOpen ? -1 : 0}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ${active ? 'text-sky-500' : 'text-gray-500'}`}
            >
              <div aria-hidden="true" className={`relative ${active ? 'scale-110' : ''} transition-transform duration-200`}>
                {item.icon(active)}
                {active && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-900 rounded-full" />}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-sky-500' : 'text-gray-500'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
