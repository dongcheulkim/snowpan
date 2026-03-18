import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages, logout } from '../api';

interface BadgeRequest {
  id: string;
  badgeType: string;
  status: string;
  image?: string;
}

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role?: string; createdAt?: string; profileImage?: string } | null>(null);
  const [badges, setBadges] = useState<BadgeRequest[]>([]);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [badgeImage, setBadgeImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = getUser();
    if (!stored) { navigate('/login'); return; }
    setUser(stored);

    // 서버에서 최신 프로필 가져오기
    api<any>('/auth/profile').then(data => {
      const updated = { ...stored, ...data };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }).catch(() => {});

    // 뱃지 요청 목록 조회
    api<BadgeRequest[]>('/auth/my-badges').then(setBadges).catch(() => {});
  }, [navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const urls = await uploadImages([file]);
      const updated = await api<any>('/auth/profile', {
        method: 'PUT',
        body: { profileImage: urls[0] },
      });
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(prev => prev ? { ...prev, profileImage: urls[0] } : prev);
    } catch {
      alert('사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const allBadges = [
    { id: 'lv2', label: 'LV2', desc: 'KSIA 레벨2 자격증', color: 'bg-accent text-white' },
    { id: 'lv3', label: 'LV3', desc: 'KSIA 레벨3 자격증', color: 'bg-purple-500 text-white' },
    { id: 'demo', label: '데몬', desc: '데몬스트레이터 자격증', color: 'bg-gold text-black' },
    { id: 'teaching', label: '티칭', desc: 'SBAK 티칭 자격증', color: 'bg-blue-500 text-white' },
    { id: 'pro', label: '프로', desc: '프로 선수 / 강사 인증', color: 'bg-coral text-white' },
  ];

  const approvedBadges = badges.filter(b => b.status === 'approved');
  const pendingBadges = badges.filter(b => b.status === 'pending');

  const handleRequestBadge = async () => {
    if (!selectedBadge) return;
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (badgeImage) {
        const urls = await uploadImages([badgeImage]);
        imageUrl = urls[0];
      }
      await api('/auth/badge-request', {
        method: 'POST',
        body: { badgeType: selectedBadge, image: imageUrl },
      });
      // 다시 조회
      const updated = await api<BadgeRequest[]>('/auth/my-badges');
      setBadges(updated);
      setShowBadgeModal(false);
      setSelectedBadge('');
      setBadgeImage(null);
      alert('인증 요청이 완료되었습니다. 관리자 승인을 기다려주세요.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const menuItems = [
    { label: '프로필 수정', link: '/mypage/edit' },
    { label: '판매 물품', link: '/mypage/sales' },
    { label: '채팅 목록', link: '/chat/rooms' },
    { label: '알림', link: '/notifications' },
  ];

  const settings = [
    { label: '이용약관', link: '/mypage/terms' },
    { label: '고객센터', link: '/mypage/support' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => profileInputRef.current?.click()}>
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl overflow-hidden hover:border-accent transition-colors">
              {uploadingPhoto ? (
                <span className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : user.profileImage ? (
                <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white pointer-events-none">
              📷
            </div>
            <input ref={profileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhoto} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              {approvedBadges.map((b) => {
                const badge = allBadges.find(ab => ab.id === b.badgeType);
                if (!badge) return null;
                return (
                  <span key={b.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                );
              })}
            </div>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { label: '가입일', value: formatDate(user.createdAt) },
            { label: '뱃지', value: `${approvedBadges.length}개` },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 bg-white rounded-lg">
              <div className="text-base font-bold text-gray-900">{stat.value}</div>
              <div className="text-[10px] text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">자격증 뱃지</h3>
          <button onClick={() => setShowBadgeModal(true)} className="px-3 py-1 bg-accent text-white rounded-lg font-bold text-[11px] hover:bg-accent-light transition-colors">
            + 인증하기
          </button>
        </div>

        {approvedBadges.length === 0 && pendingBadges.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">아직 인증된 뱃지가 없습니다. 자격증을 인증해보세요!</p>
        ) : (
          <div className="space-y-2">
            {approvedBadges.map((b) => {
              const badge = allBadges.find(ab => ab.id === b.badgeType);
              if (!badge) return null;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-mint">인증 완료</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingBadges.map((b) => {
              const badge = allBadges.find(ab => ab.id === b.badgeType);
              if (!badge) return null;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-yellow-500">승인 대기 중</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="card overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link key={item.label} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < menuItems.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            <span className="text-gray-400 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* Admin */}
      {user.role === 'admin' && (
        <div className="card overflow-hidden">
          <Link to="/admin-approval" className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block">
            <span className="text-sm font-medium text-coral">관리자 승인 관리</span>
            <span className="text-coral text-xs">→</span>
          </Link>
        </div>
      )}

      {/* Settings */}
      <div className="card overflow-hidden">
        {settings.map((item, idx) => (
          <Link key={item.label} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < settings.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-500">{item.label}</span>
            <span className="text-gray-400 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-3.5 bg-white text-gray-500 rounded-xl font-medium text-sm border border-gray-200 hover:bg-coral/10 hover:text-coral hover:border-coral/20 transition-all active:scale-[0.98]">
        로그아웃
      </button>

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBadgeModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">자격증 인증</h3>
            <p className="text-xs text-gray-400 mb-5">인증할 자격증을 선택하세요</p>

            <div className="space-y-2 mb-5">
              {allBadges.filter(b => !badges.some(ub => ub.badgeType === b.id)).map((badge) => (
                <button key={badge.id} onClick={() => setSelectedBadge(badge.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedBadge === badge.id ? 'bg-accent/10 border-accent/20' : 'bg-gray-100 border-gray-300 hover:border-gray-400'}`}>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                  <div className="text-left">
                    <div className={`text-xs font-medium ${selectedBadge === badge.id ? 'text-gray-900' : 'text-gray-500'}`}>{badge.desc}</div>
                  </div>
                </button>
              ))}
              {allBadges.filter(b => !badges.some(ub => ub.badgeType === b.id)).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">모든 뱃지를 이미 신청했습니다!</p>
              )}
            </div>

            {selectedBadge && (
              <div className="bg-gray-100 rounded-lg p-3 mb-5 border border-gray-300">
                <p className="text-[11px] text-gray-400 mb-2">자격증 사진을 업로드해주세요</p>
                <label className="block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-accent/50 hover:text-accent-light transition-all">
                  {badgeImage ? badgeImage.name : '사진 선택'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setBadgeImage(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowBadgeModal(false); setSelectedBadge(''); setBadgeImage(null); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={handleRequestBadge} disabled={!selectedBadge || submitting} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? '요청 중...' : '인증 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
