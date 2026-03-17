import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-accent-light tracking-tight">
                스노우판
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <Link
                  to="/chat/rooms"
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative"
                  title="채팅"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>
                <Link
                  to="/notifications"
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative"
                  title="알림"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </Link>
                <Link
                  to="/mypage"
                  className="px-4 py-1.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
                >
                  내정보
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
