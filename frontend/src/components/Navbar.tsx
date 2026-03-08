import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-strong sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <span className="text-2xl group-hover:animate-float">⛷️</span>
              <span className="text-xl font-bold gradient-text tracking-tight">
                스노우프라이스
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            {[
              { to: '/new-equipment', label: '새 장비' },
              { to: '/used', label: '중고' },
              { to: '/rental', label: '렌탈' },
              { to: '/lesson', label: '레슨' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                  isActive(to)
                    ? 'bg-neon-blue/15 text-neon-blue neon-border'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/login"
              className="ml-3 px-5 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-neon-blue/25 transition-all duration-300 active:scale-95"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
