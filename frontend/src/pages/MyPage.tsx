import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      navigate('/login');
    }
    const storedBadges = localStorage.getItem('badges');
    if (storedBadges) {
      setBadges(JSON.parse(storedBadges));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const allBadges = [
    { id: 'lv2', label: 'LV2', desc: 'KSIA/KASA 레벨2 자격증' },
    { id: 'lv3', label: 'LV3', desc: 'KSIA/KASA 레벨3 자격증' },
    { id: 'demo', label: '데몬', desc: '데몬스트레이터 자격증' },
    { id: 'pro', label: '프로', desc: '프로 선수 / 강사 인증' },
  ];

  const handleRequestBadge = () => {
    if (!selectedBadge) return;
    const newBadges = [...badges, selectedBadge];
    setBadges(newBadges);
    localStorage.setItem('badges', JSON.stringify(newBadges));
    setShowBadgeModal(false);
    setSelectedBadge('');
  };

  const handleRemoveBadge = (badgeId: string) => {
    const newBadges = badges.filter(b => b !== badgeId);
    setBadges(newBadges);
    localStorage.setItem('badges', JSON.stringify(newBadges));
  };

  if (!user) return null;

  const menuItems = [
    { label: '판매 내역', count: 3 },
    { label: '구매 내역', count: 1 },
    { label: '찜 목록', count: 5 },
    { label: '채팅 목록', count: 2 },
    { label: '내 게시글', count: 4 },
  ];

  const settings = [
    { label: '알림 설정' },
    { label: '비밀번호 변경' },
    { label: '이용약관' },
    { label: '고객센터' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Profile */}
      <div className="card rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-2xl">
            👤
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              {badges.map((badgeId) => {
                const badge = allBadges.find(b => b.id === badgeId);
                if (!badge) return null;
                return (
                  <span key={badge.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black">
                    {badge.label}
                  </span>
                );
              })}
            </div>
            <p className="text-sm text-gray-500">@{user.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: '거래', value: '4건' },
            { label: '평점', value: '4.8' },
            { label: '가입일', value: '2024.01' },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 bg-[#0a0a0a] rounded-lg">
              <div className="text-base font-bold text-white">{stat.value}</div>
              <div className="text-[10px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="card rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">자격증 뱃지</h3>
          <button
            onClick={() => setShowBadgeModal(true)}
            className="px-3 py-1 bg-white text-black rounded-lg font-bold text-[11px] hover:bg-gray-200 transition-colors"
          >
            + 인증하기
          </button>
        </div>

        {badges.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">
            아직 인증된 뱃지가 없습니다. 자격증을 인증해보세요!
          </p>
        ) : (
          <div className="space-y-2">
            {badges.map((badgeId) => {
              const badge = allBadges.find(b => b.id === badgeId);
              if (!badge) return null;
              return (
                <div key={badge.id} className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-black">
                      {badge.label}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-white">{badge.desc}</div>
                      <div className="text-[10px] text-gray-500">인증 완료</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveBadge(badge.id)}
                    className="text-[10px] text-gray-600 hover:text-red-400 transition-colors px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="card rounded-lg overflow-hidden">
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1a] transition-all ${
              idx < menuItems.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <span className="text-sm font-medium text-white">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                {item.count}
              </span>
              <span className="text-gray-600 text-xs">→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Settings */}
      <div className="card rounded-lg overflow-hidden">
        {settings.map((item, idx) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1a] transition-all ${
              idx < settings.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <span className="text-sm font-medium text-gray-400">{item.label}</span>
            <span className="text-gray-600 text-xs">→</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-[#111] text-gray-400 rounded-lg font-medium text-sm border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-[0.98]"
      >
        로그아웃
      </button>

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowBadgeModal(false)} />
          <div className="relative bg-[#111] rounded-lg p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2">자격증 인증</h3>
            <p className="text-xs text-gray-500 mb-5">인증할 자격증을 선택하세요</p>

            <div className="space-y-2 mb-5">
              {allBadges
                .filter(b => !badges.includes(b.id))
                .map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedBadge === badge.id
                        ? 'bg-white/10 border-white/30'
                        : 'bg-[#0a0a0a] border-white/5 hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-black">
                      {badge.label}
                    </span>
                    <div className="text-left">
                      <div className={`text-xs font-medium ${selectedBadge === badge.id ? 'text-white' : 'text-gray-400'}`}>
                        {badge.desc}
                      </div>
                    </div>
                  </button>
                ))}
              {allBadges.filter(b => !badges.includes(b.id)).length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">모든 뱃지를 이미 인증했습니다!</p>
              )}
            </div>

            {selectedBadge && (
              <div className="bg-[#0a0a0a] rounded-lg p-3 mb-5 border border-white/5">
                <p className="text-[11px] text-gray-500 mb-2">자격증 사진을 업로드해주세요</p>
                <label className="block w-full py-3 border-2 border-dashed border-white/10 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-white/20 hover:text-gray-400 transition-all">
                  사진 선택
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBadgeModal(false); setSelectedBadge(''); }}
                className="flex-1 py-3 bg-[#1a1a1a] text-gray-400 rounded-lg font-medium text-sm border border-white/5 hover:bg-[#222] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRequestBadge}
                disabled={!selectedBadge}
                className="flex-1 py-3 bg-white text-black rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                인증 요청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
