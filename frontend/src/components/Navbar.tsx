import { useState, useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import { loginPath } from '../utils/loginPath';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { tryRefreshAccessToken, api, getToken } from '../api';
import type { Socket } from 'socket.io-client';
import { t, onLangChange } from '../i18n';
import { showBrowserNotification } from '../utils/pushNotification';
import Logo from './Logo';
import { useVertical } from '../hooks/useVertical';

type NotifRow = { read?: boolean; type?: string };
type ChatRoomRow = { unreadCount?: number };
type PushPayload = { type?: string; title?: string; message?: string; body?: string; link?: string };

const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

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

// PC 상단 메뉴 (lg 이상에서만 보임)
const PC_MENU: { to: string; label: string }[] = [
  { to: '/new-equipment', label: '스키·보드샵' }, { to: '/repair', label: '정비샵' }, { to: '/rental', label: '렌탈샵' },
  { to: '/used', label: '중고거래' }, { to: '/lesson', label: '레슨' }, { to: '/accommodation', label: '숙소' },
  { to: '/community', label: '커뮤니티' }, { to: '/webcam', label: '실시간웹캠' }, { to: '/overseas', label: '스키장 투어' },
];

const Navbar = () => {
  const location = useLocation();
  const raw = useLocalStorageUser();
  useI18nRerender();
  const vertical = useVertical();
  void location.pathname;

  let user: { id: string; name: string } | null = null;
  try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }

  const [hasUnread, setHasUnread] = useState(false);
  // PC 상단에 '매장 관리' 바로가기 — 매장을 가진 사장님에게만 (세션 동안 기억해 화면마다 다시 묻지 않음)
  const [isOwner, setIsOwner] = useState<boolean>(() => { try { return sessionStorage.getItem('snowpan.isOwner') === '1'; } catch { return false; } });
  useEffect(() => {
    if (!user?.id) { setIsOwner(false); return; }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return; // 폰에서는 이 버튼이 안 보이니 요청하지 않음
    api<{ isOwner: boolean }>('/auth/business-status').then((d) => { setIsOwner(!!d.isOwner); try { sessionStorage.setItem('snowpan.isOwner', d.isOwner ? '1' : '0'); } catch { /* ignore */ } }).catch(() => {});
     
  }, [user?.id]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchNotifCount = useCallback(() => {
    try {
      if (!user) return;
      const token = getToken();
      if (!token) return;
      api<NotifRow[] | { notifications?: NotifRow[] }>('/notifications?limit=50')
        .then(data => {
          try {
            const notifs = Array.isArray(data) ? data : (data?.notifications || []);
            const count = notifs.filter((n: NotifRow) => !n.read && n.type !== 'chat').length; // 채팅은 벨 제외(자체 점 dot)
            setUnreadNotifCount(count);
          } catch { /* 응답 형식이 달라도 벨 숫자만 건너뜀 */ }
        })
        .catch(() => {});
    } catch { /* 토큰 읽기 실패 등은 무시 */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  // 안 읽은 채팅이 있는지 서버에 물어 PC 점(hasUnread)과 폰 하단 탭 점(snowpan:chat-unread 이벤트)을 같이 맞춘다.
  // force=false 면 30초 안엔 다시 묻지 않음. 채팅 화면을 떠날 때·읽음 처리 직후엔 force 로 바로 갱신
  // (2026-10-08 사장님 "다 읽었는데 아직도 빨간 점": 읽고 30초 안에 나오면 옛 결과가 남아 있었음).
  const refreshChatUnread = useCallback((force = false) => {
    if (!user || !getToken()) return;
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;
    api<ChatRoomRow[]>('/chat/rooms')
      .then(data => {
        try {
          const rooms = Array.isArray(data) ? data : [];
          const total = rooms.reduce((sum: number, r: ChatRoomRow) => sum + (r.unreadCount || 0), 0);
          setHasUnread(total > 0);
          window.dispatchEvent(new CustomEvent('snowpan:chat-unread', { detail: total > 0 }));
        } catch { /* 형식 오류는 무시 */ }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    const leftChat = prevPathRef.current.startsWith('/chat') && !location.pathname.startsWith('/chat');
    prevPathRef.current = location.pathname;
    refreshChatUnread(leftChat); // 채팅에서 나올 땐 방금 읽은 걸 바로 반영
    fetchNotifCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 채팅 화면이 읽음 처리를 보내면 잠시 뒤(서버 반영 후) 다시 조회
  useEffect(() => {
    const on = () => { setTimeout(() => refreshChatUnread(true), 400); };
    window.addEventListener('snowpan:chat-read', on);
    return () => window.removeEventListener('snowpan:chat-read', on);
  }, [refreshChatUnread]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    // socket.io 는 로그인한 사람만 필요 — 첫 번들에서 빼고 여기서 받는다 (2026-09-27 성능, 비로그인 15KB 절약)
    let socket: Socket | null = null;
    let disposed = false;
    import('socket.io-client').then(({ io }) => {
    if (disposed) return;
    // 함수형 auth — 재연결 시 최신 토큰을 다시 읽음. 고정 토큰이면 1시간 만료 후
    // 재연결이 인증 거부돼 실시간 알림이 조용히 끊김.
    const s = io(SERVER_URL, { auth: (cb: (d: { token: string }) => void) => cb({ token: getToken() || '' }) });
    socket = s;
    socketRef.current = s;

    // 토큰 만료로 핸드셰이크가 거부되면 Socket.IO 는 자동 재연결을 멈춤(active=false).
    // refresh 성공 시 수동 재연결 — 없으면 1시간 뒤 실시간 알림이 조용히 죽음.
    let refreshingSock = false;
    s.on('connect_error', async () => {
      if (refreshingSock) return;
      refreshingSock = true;
      try {
        const t = await tryRefreshAccessToken();
        if (t) s.connect();
      } finally { refreshingSock = false; }
    });

    s.on('new_notification', (data: PushPayload | undefined) => {
      if (data?.type === 'chat') {
        // 채팅: 벨 카운트 제외(자체 점 dot). 다른 화면에 있을 때도 포그라운드 알림 표시
        // (new_message 는 room 조인해야 오는데 Navbar 는 user 채널만 조인 → 여기서 처리).
        // 지금 그 방을 보고 있으면 바로 읽히므로 점을 켜지 않는다 (방 안에서 켜진 점이 나온 뒤에도 남던 원인)
        const inThatRoom = !!data?.link && window.location.pathname === data.link;
        if (!inThatRoom) {
          setTimeout(() => setHasUnread(true), 0);
          try { window.dispatchEvent(new CustomEvent('snowpan:chat-unread', { detail: true })); } catch { /* 무시 */ }
        }
        showBrowserNotification({
          title: data?.title || '새 메시지',
          body: data?.message || data?.body,
          link: data?.link || '/chat/rooms',
          tag: 'chat',
        });
        return;
      }
      setTimeout(() => setUnreadNotifCount((prev) => prev + 1), 0);
      showBrowserNotification({
        title: data?.title || '새 알림',
        body: data?.message || data?.body,
        link: data?.link,
        tag: data?.type || 'snowpan',
      });
    });

    }).catch(() => { /* 소켓 모듈을 못 받으면 실시간 알림만 없음 */ });

    return () => {
      disposed = true;
      socket?.disconnect();
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

  // 앱 우선 — phone-width 컨테이너라 헤더엔 로고 + 검색/알림/로그인만.
  // 카테고리 진입은 홈의 아이콘 그리드, 하단 BottomNav 사용.
  void vertical;


  return (
    <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b transition-shadow duration-300 pt-[env(safe-area-inset-top)] ${scrolled ? 'shadow-md border-transparent' : 'border-gray-200'}`}>
      <div className="px-4 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <div className="flex items-center justify-between h-14 lg:h-16 lg:gap-6">
          {/* 로고 = 홈 링크. 판 스위처(런닝·바이크·골프)는 출시 전까지 숨김 — 복원은 git 히스토리 참고 */}
          <Link to="/" aria-label="스노우판 홈으로">
            <Logo />
          </Link>

          {/* PC 전용 가로 메뉴 — 폰에서는 홈 아이콘 그리드와 하단 탭이 이 역할 (2026-10-05) */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto no-scrollbar" role="navigation" aria-label="카테고리">
            {PC_MENU.map((m) => (
              <NavLink key={m.to} to={m.to} className={({ isActive }) => `px-2.5 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap flex-shrink-0 transition-colors ${isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{m.label}</NavLink>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              to={`${vertical.slug === 'snow' ? '' : vertical.basePath}/search`}
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
            {/* PC 전용: 하단 탭이 없으니 채팅·MY 를 여기에 */}
            {user && (
              <Link to="/chat/rooms" className="hidden lg:inline-flex relative items-center min-h-11 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">
                채팅
                {hasUnread && <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-coral" aria-label="새 메시지" />}
              </Link>
            )}
            {user && isOwner && (
              <Link to="/mypage/shops" className="hidden lg:inline-flex items-center min-h-11 px-3 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">매장 관리</Link>
            )}
            {user && (
              <Link to="/mypage" className="hidden lg:inline-flex items-center min-h-11 px-4 ml-1 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-700">MY</Link>
            )}
            {!user && (
              <Link
                to={loginPath()}
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
