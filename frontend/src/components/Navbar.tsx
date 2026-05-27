import { useState, useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, getToken } from '../api';
import { io, Socket } from 'socket.io-client';
import { t, onLangChange } from '../i18n';
import { showBrowserNotification } from '../utils/pushNotification';
import Logo from './Logo';
import { useVertical } from '../hooks/useVertical';

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
  const vertical = useVertical();
  void location.pathname;

  let user: { id: string; name: string } | null = null;
  try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }

  const [, setHasUnread] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const lastFetchRef = useRef<number>(0);

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

  // Navbar 는 SNOWPAN 안에서만 렌더링됨 (MainLayout 가 미출시 vertical 에선 숨김).
  // 5종목 미출시 동안 단순화 — snow 고정 경로만 사용.
  void vertical;
  const navLinks: { label: string; to: string }[] = [
    { label: '중고거래', to: '/used' },
    { label: '스키샵', to: '/skishop' },
    { label: '렌탈', to: '/rental' },
    { label: '레슨', to: '/lesson' },
    { label: '숙소', to: '/accommodation' },
    { label: '커뮤니티', to: '/community' },
  ];
  const logoLink = '/snowpan';

  return (
    <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b transition-shadow duration-300 ${scrolled ? 'shadow-md border-transparent' : 'border-gray-200'}`}>
      <div className="px-4">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              {/* PAN 우산 허브로 — 다른 플랫폼 둘러보거나 돌아가는 진입점 */}
              <Link
                to="/pan"
                aria-label="PAN 플랫폼 허브"
                className="text-[10px] font-black tracking-[0.25em] text-gray-400 hover:text-gray-900 transition-colors px-1.5 py-1 border border-gray-200 rounded-md hover:border-gray-900"
              >
                ← PAN
              </Link>
              <Link to={logoLink} aria-label={`${vertical.name} 홈`}>
                <Logo />
              </Link>
            </div>
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
                className="inline-flex items-center justify-center min-h-11 px-4 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
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
