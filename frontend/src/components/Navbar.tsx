import { useState, useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, getToken } from '../api';
import { io, Socket } from 'socket.io-client';
import { t, onLangChange } from '../i18n';
import { showBrowserNotification } from '../utils/pushNotification';
import Logo from './Logo';

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

function useLocalStorageUser() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb); },
    () => localStorage.getItem('user') ?? sessionStorage.getItem('user'),
  );
}

function useI18nRerender() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return onLangChange(() => setTimeout(() => setTick((p) => p + 1), 0));
  }, []);
}

const Navbar = () => {
  const location = useLocation();
  const raw = useLocalStorageUser();
  useI18nRerender();
  void location.pathname;

  let user: { id: string; name: string } | null = null;
  try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }

  const [, setHasUnread] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const lastFetchRef = useRef<number>(0);
  const [darkMode, setDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const fetchNotifCount = useCallback(() => {
    try {
      if (!user) return;
      const token = getToken();
      if (!token) return;
      api<any>('/notifications?limit=50')
        .then(data => {
          try {
            const notifs = Array.isArray(data) ? data : (data?.notifications || []);
            const count = notifs.filter((n: any) => !n.read).length;
            setUnreadNotifCount(count);
          } catch {}
        })
        .catch(() => {});
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    const token = getToken();
    if (!token) return;

    const now = Date.now();
    if (now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;

    api<any>('/chat/rooms')
      .then(data => {
        try {
          const rooms = Array.isArray(data) ? data : [];
          const total = rooms.reduce((sum: number, r: any) => sum + (r.unreadCount || 0), 0);
          setHasUnread(total > 0);
        } catch {}
      })
      .catch(() => {});

    fetchNotifCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('new_notification', (data: any) => {
      setTimeout(() => setUnreadNotifCount((prev) => prev + 1), 0);
      if (data?.type === 'chat') {
        setTimeout(() => setHasUnread(true), 0);
        // chat 알림은 new_message 핸들러에서 표시 — 중복 방지
        return;
      }
      showBrowserNotification({
        title: data?.title || '새 알림',
        body: data?.message || data?.body,
        link: data?.link,
        tag: data?.type || 'snowpan',
      });
    });

    socket.on('new_message', (data: any) => {
      setTimeout(() => setHasUnread(true), 0);
      // 본인이 보낸 메시지는 알림 X
      if (data?.senderId === user?.id) return;
      const senderName = data?.sender?.nickname || data?.sender?.name || '알 수 없음';
      showBrowserNotification({
        title: `${senderName}님의 메시지`,
        body: data?.content || '새 메시지가 도착했어요',
        link: data?.roomId ? `/chat/${data.roomId}` : '/chat/rooms',
        tag: data?.roomId ? `chat-${data.roomId}` : 'chat',
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 데스크톱 헤더 카테고리 — 모바일은 홈 카테고리 그리드, 데스크톱은 상단 텍스트 링크.
  const navLinks: { label: string; to: string }[] = [
    { label: '중고거래', to: '/used' },
    { label: '스키샵', to: '/skishop' },
    { label: '렌탈', to: '/rental' },
    { label: '레슨', to: '/lesson' },
    { label: '숙소', to: '/accommodation' },
    { label: '커뮤니티', to: '/community' },
  ];

  return (
    <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b transition-shadow duration-300 ${scrolled ? 'shadow-md border-transparent' : 'border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-8">
            <Link to="/" aria-label="스노우판 홈">
              <Logo />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => {
                const active = location.pathname === l.to || location.pathname.startsWith(l.to + '/');
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`px-3 h-11 inline-flex items-center rounded-lg text-sm font-medium transition-colors ${active ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-pressed={darkMode}
              className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m11.32 0 1.41 1.41M4.93 4.93l1.41 1.41M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                </svg>
              )}
            </button>
            <Link
              to="/search"
              aria-label="검색"
              className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            {user && (
              <Link
                to="/notifications"
                className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative"
                title={t('nav.notifications')}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </Link>
            )}
            {!user && (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
