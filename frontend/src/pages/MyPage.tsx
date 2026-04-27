import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, setUser as saveUser, uploadImages, logout } from '../api';
import { CameraIcon, UserIcon } from '../components/Icons';
import { t, onLangChange, getLang, setLang } from '../i18n';

interface BadgeRequest {
  id: string;
  badgeType: string;
  status: string;
  image?: string;
}

const badgeDisplay: Record<string, { label: string; desc: string; color: string }> = {
  lv1: { label: 'LV1', desc: 'KSIA 레벨1', color: 'bg-green-500 text-white' },
  lv2: { label: 'LV2', desc: 'KSIA 레벨2', color: 'bg-accent text-white' },
  lv3: { label: 'LV3', desc: 'KSIA 레벨3', color: 'bg-purple-500 text-white' },
  demo: { label: '데몬', desc: '데몬스트레이터', color: 'bg-gold text-black' },
  teaching1: { label: '티칭1', desc: 'SBAK 티칭1', color: 'bg-blue-400 text-white' },
  teaching2: { label: '티칭2', desc: 'SBAK 티칭2', color: 'bg-blue-500 text-white' },
  teaching3: { label: '티칭3', desc: 'SBAK 티칭3', color: 'bg-blue-700 text-white' },
  pro: { label: '프로', desc: '프로 선수 / 강사', color: 'bg-coral text-white' },
  cert: { label: '심사중', desc: '자격증 심사 중', color: 'bg-gray-400 text-white' },
};

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string; nickname?: string; displayName?: string; email: string; role?: string; createdAt?: string; profileImage?: string } | null>(null);
  const [badges, setBadges] = useState<BadgeRequest[]>([]);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const [badgeImage, setBadgeImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [lang, setLangState] = useState<'ko' | 'en'>(getLang);
  const [, setLangTick] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  useEffect(() => {
    const stored = getUser();
    if (!stored) { navigate('/login'); return; }
    setUser(stored);

    // 서버에서 최신 프로필 가져오기
    api<Record<string, unknown>>('/auth/profile').then(data => {
      const updated = { ...stored, ...data };
      setUser(updated);
      saveUser(updated);
    }).catch(() => {});

    // 뱃지 요청 목록 조회
    api<BadgeRequest[]>('/auth/my-badges').then(setBadges).catch(() => {});
    // 광고 예약 목록 조회
  }, [navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { alert('비밀번호를 입력해주세요.'); return; }
    setDeleting(true);
    try {
      await api('/auth/account', { method: 'DELETE', body: { password: deletePassword } });
      logout();
      alert('탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '탈퇴 처리에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const urls = await uploadImages([file]);
      const updated = await api<Record<string, unknown>>('/auth/profile', {
        method: 'PUT',
        body: { profileImage: urls[0] },
      });
      saveUser(updated);
      setUser(prev => prev ? { ...prev, profileImage: urls[0] } : prev);
    } catch {
      alert('사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const approvedBadges = badges.filter(b => b.status === 'approved');
  const pendingBadges = badges.filter(b => b.status === 'pending');

  const handleRequestBadge = async () => {
    if (!badgeImage) return;
    setSubmitting(true);
    try {
      let imageUrl = '';
      const urls = await uploadImages([badgeImage]);
      imageUrl = urls[0];
      await api('/auth/badge-request', {
        method: 'POST',
        body: { badgeType: 'cert', image: imageUrl },
      });
      const updated = await api<BadgeRequest[]>('/auth/my-badges');
      setBadges(updated);
      setShowBadgeModal(false);
      setBadgeImage(null);
      alert('인증 요청이 완료되었습니다. 관리자가 확인 후 적절한 뱃지를 부여합니다.');
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
    { label: t('mypage.editProfile'), link: '/mypage/edit' },
    { label: t('mypage.mySales'), link: '/mypage/sales' },
    { label: t('mypage.wishlist'), link: '/mypage/wishlist' },
    { label: t('mypage.recentlyViewed'), link: '/mypage/recent' },
    { label: '광고 관리', link: '/mypage/ads' },
    { label: t('mypage.chatList'), link: '/chat/rooms' },
    { label: t('mypage.notifications'), link: '/notifications' },
  ];

  const toggleDarkMode = () => {
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

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko';
    setLangState(next);
    setLang(next);
  };

  const settings = [
    { label: t('mypage.terms'), link: '/mypage/terms' },
    { label: '개인정보처리방침', link: '/privacy' },
    { label: '안전거래 가이드', link: '/safe-trade' },
    { label: t('mypage.support'), link: '/mypage/support' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => profileInputRef.current?.click()}>
            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden hover:border-gray-900 transition-colors">
              {uploadingPhoto ? (
                <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              ) : user.profileImage ? (
                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={28} />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center border-2 border-white pointer-events-none">
              <CameraIcon size={11} strokeWidth={2} />
            </div>
            <input ref={profileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhoto} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{user.nickname || user.name}</h2>
              {approvedBadges.map((b) => {
                const badge = badgeDisplay[b.badgeType];
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
            { label: t('mypage.joinDate'), value: formatDate(user.createdAt) },
            { label: t('mypage.badges'), value: `${approvedBadges.length}개` },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 bg-white rounded-lg">
              <div className="text-base font-bold text-gray-900">{stat.value}</div>
              <div className="text-[10px] text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges - 관리자에겐 숨김 */}
      {user.role !== 'admin' && <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">{t('mypage.certBadge')}</h3>
          <button onClick={() => setShowBadgeModal(true)} className="px-3 py-1 bg-accent text-white rounded-lg font-bold text-[11px] hover:bg-accent-light transition-colors">
            + {t('mypage.verify')}
          </button>
        </div>

        {approvedBadges.length === 0 && pendingBadges.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t('mypage.noBadges')}</p>
        ) : (
          <div className="space-y-2">
            {approvedBadges.map((b) => {
              const badge = badgeDisplay[b.badgeType];
              if (!badge) return null;
              const isActive = (user as any).activeBadge === b.badgeType;
              return (
                <div key={b.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${isActive ? 'border-sky-400 bg-sky-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-mint">{t('mypage.verified')}</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newBadge = isActive ? null : b.badgeType;
                      try {
                        await api('/auth/profile', { method: 'PUT', body: { activeBadge: newBadge } });
                        setUser((prev: any) => prev ? { ...prev, activeBadge: newBadge } : prev);
                        saveUser({ ...user, activeBadge: newBadge });
                      } catch {}
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${isActive ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {isActive ? '노출중' : '노출'}
                  </button>
                </div>
              );
            })}
            {pendingBadges.map((b) => {
              const badge = badgeDisplay[b.badgeType];
              if (!badge) return null;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-yellow-500">{t('mypage.pendingApproval')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* Menu */}
      <div className="card overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link key={item.link} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < menuItems.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            <span className="text-gray-400 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* Admin */}
      {user.role === 'admin' && (
        <div className="card overflow-hidden">
          <Link to="/admin-approval" className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block border-b border-gray-200">
            <span className="text-sm font-medium text-coral">{t('mypage.adminApproval')}</span>
            <span className="text-coral text-xs">→</span>
          </Link>
          <Link to="/admin" className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block">
            <span className="text-sm font-medium text-coral">{t('mypage.adminDashboard')}</span>
            <span className="text-coral text-xs">→</span>
          </Link>
        </div>
      )}

      {/* Dark Mode & Language */}
      <div className="card overflow-hidden">
        <div className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-900">{t('mypage.darkMode')}</span>
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-accent' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-sm font-medium text-gray-900">{t('mypage.langLabel')}</span>
          <button
            onClick={toggleLang}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors"
          >
            {lang === 'ko' ? 'English' : '한국어'}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="card overflow-hidden">
        {settings.map((item, idx) => (
          <Link key={item.link} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < settings.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-500">{item.label}</span>
            <span className="text-gray-400 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-3.5 bg-white text-gray-500 rounded-xl font-medium text-sm border border-gray-200 hover:bg-coral/10 hover:text-coral hover:border-coral/20 transition-all active:scale-[0.98]">
        {t('mypage.logout')}
      </button>

      {/* Account deletion */}
      <div className="text-center mt-3">
        <button
          onClick={() => { setDeletePassword(''); setShowDeleteModal(true); }}
          className="text-xs text-gray-400 hover:text-coral transition-colors underline underline-offset-2"
        >
          회원 탈퇴
        </button>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">회원 탈퇴</h3>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 text-[12px] text-rose-700 leading-relaxed">
              <p className="font-bold mb-1">탈퇴 시 처리되는 내용</p>
              <ul className="space-y-0.5 list-disc list-inside marker:text-rose-400">
                <li>이메일·전화번호·이름 등 개인정보 삭제</li>
                <li>판매중 매물은 자동으로 거둠</li>
                <li>거래·후기·게시글은 익명 처리되어 유지</li>
                <li>같은 정보로 재가입은 즉시 불가</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 mb-2">계속하려면 비밀번호를 입력해주세요.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-coral mb-5"
              autoComplete="current-password"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 py-3 bg-coral text-white rounded-lg font-bold text-sm hover:bg-coral/90 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBadgeModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('mypage.certVerification')}</h3>
            <p className="text-xs text-gray-400 mb-5">자격증 사진을 첨부하면 관리자가 확인 후 적절한 뱃지를 부여합니다.</p>

            <div className="bg-gray-100 rounded-lg p-3 mb-5 border border-gray-300">
              <p className="text-[11px] text-gray-400 mb-2">{t('mypage.uploadCertPhoto')}</p>
              <label className="block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-accent/50 hover:text-accent-light transition-all">
                {badgeImage ? badgeImage.name : t('mypage.selectPhoto')}
                <input type="file" accept="image/*" className="hidden" onChange={e => setBadgeImage(e.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowBadgeModal(false); setBadgeImage(null); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors">{t('btn.cancel')}</button>
              <button onClick={handleRequestBadge} disabled={!badgeImage || submitting} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? t('mypage.requesting') : t('mypage.verifyRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
