import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  const menuItems = [
    { icon: '🛒', label: '판매 내역', count: 3 },
    { icon: '💰', label: '구매 내역', count: 1 },
    { icon: '❤️', label: '찜 목록', count: 5 },
    { icon: '💬', label: '채팅 목록', count: 2 },
    { icon: '📝', label: '내 게시글', count: 4 },
  ];

  const settings = [
    { icon: '🔔', label: '알림 설정' },
    { icon: '🔒', label: '비밀번호 변경' },
    { icon: '📋', label: '이용약관' },
    { icon: '❓', label: '고객센터' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      {/* Profile Card */}
      <div className="glass rounded-2xl p-6 neon-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-2xl">
            👤
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-sm text-gray-500">@{user.id}</p>
          </div>
          <Link
            to="/used/register"
            className="px-3 py-1.5 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-lg font-medium text-xs hover:shadow-lg hover:shadow-neon-green/25 transition-all active:scale-95"
          >
            + 장비 등록
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: '거래', value: '4건' },
            { label: '평점', value: '4.8' },
            { label: '가입일', value: '2024.01' },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 bg-white/5 rounded-xl">
              <div className="text-base font-bold text-white">{stat.value}</div>
              <div className="text-[10px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="glass rounded-2xl overflow-hidden">
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all ${
              idx < menuItems.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-white">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neon-blue font-bold bg-neon-blue/10 px-2 py-0.5 rounded-full">
                {item.count}
              </span>
              <span className="text-gray-600 text-xs">→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Settings */}
      <div className="glass rounded-2xl overflow-hidden">
        {settings.map((item, idx) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all ${
              idx < settings.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-gray-300">{item.label}</span>
            </div>
            <span className="text-gray-600 text-xs">→</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-white/5 text-gray-400 rounded-xl font-medium text-sm border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-[0.98]"
      >
        로그아웃
      </button>
    </div>
  );
};

export default MyPage;
