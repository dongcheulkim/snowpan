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
    <nav className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-accent-light tracking-tight">
                스노우판
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            {[
              { to: '/used', label: '중고' },
              { to: '/rental', label: '렌탈' },
              { to: '/lesson', label: '레슨' },
              { to: '/accommodation', label: '숙소' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(to)
                    ? 'bg-accent text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            {user ? (
              <Link
                to="/mypage"
                className="ml-2 px-4 py-1.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
              >
                내정보
              </Link>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-4 py-1.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
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
