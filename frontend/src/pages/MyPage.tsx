import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages, logout } from '../api';
import { t, onLangChange, getLang, setLang } from '../i18n';

interface BadgeRequest {
  id: string;
  badgeType: string;
  status: string;
  image?: string;
}

interface AdRequest {
  id: string;
  type: string;
  category: string | null;
  title: string;
  description: string;
  url: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; name: string; nickname?: string; displayName?: string; email: string; role?: string; createdAt?: string; profileImage?: string } | null>(null);
  const [badges, setBadges] = useState<BadgeRequest[]>([]);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [badgeImage, setBadgeImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [lang, setLangState] = useState<'ko' | 'en'>(getLang);
  const [, setLangTick] = useState(0);

  // 광고 신청 상태
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adForm, setAdForm] = useState({ type: 'main_banner', category: '', title: '', description: '', url: '', message: '' });
  const [adSubmitting, setAdSubmitting] = useState(false);

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
      sessionStorage.setItem('user', JSON.stringify(updated));
    }).catch(() => {});

    // 뱃지 요청 목록 조회
    api<BadgeRequest[]>('/auth/my-badges').then(setBadges).catch(() => {});
    // 광고 신청 목록 조회
    api<AdRequest[]>('/auth/my-ad-requests').then(setAdRequests).catch(() => {});
  }, [navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleAdSubmit = async () => {
    if (!adForm.title || !adForm.description || !adForm.url) {
      alert('제목, 설명, URL은 필수입니다.');
      return;
    }
    setAdSubmitting(true);
    try {
      await api('/auth/ad-request', {
        method: 'POST',
        body: {
          type: adForm.type,
          category: adForm.type === 'category' ? adForm.category : undefined,
          title: adForm.title,
          description: adForm.description,
          url: adForm.url,
          message: adForm.message || undefined,
        },
      });
      const updated = await api<AdRequest[]>('/auth/my-ad-requests');
      setAdRequests(updated);
      setShowAdModal(false);
      setAdForm({ type: 'main_banner', category: '', title: '', description: '', url: '', message: '' });
      alert('광고 신청이 완료되었습니다. 관리자 검토 후 승인됩니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '신청에 실패했습니다.');
    } finally {
      setAdSubmitting(false);
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
      sessionStorage.setItem('user', JSON.stringify(updated));
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
    { label: t('mypage.editProfile'), link: '/mypage/edit' },
    { label: t('mypage.mySales'), link: '/mypage/sales' },
    { label: t('mypage.wishlist'), link: '/mypage/wishlist' },
    { label: t('mypage.recentlyViewed'), link: '/mypage/recent' },
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
    { label: t('mypage.support'), link: '/mypage/support' },
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
                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
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
              <h2 className="text-xl font-bold text-gray-900">{user.nickname || user.name}</h2>
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

      {/* Badges */}
      <div className="card p-5">
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
              const badge = allBadges.find(ab => ab.id === b.badgeType);
              if (!badge) return null;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-mint">{t('mypage.verified')}</div>
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
                      <div className="text-[10px] text-yellow-500">{t('mypage.pendingApproval')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 광고 신청 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">📢 광고 신청</h3>
          <button onClick={() => setShowAdModal(true)} className="px-3 py-1 bg-accent text-white rounded-lg font-bold text-[11px] hover:bg-accent-light transition-colors">
            + 신청하기
          </button>
        </div>
        {adRequests.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">신청한 광고가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {adRequests.map((ad) => (
              <div key={ad.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ad.status === 'approved' ? 'bg-mint/20 text-emerald-700' :
                      ad.status === 'rejected' ? 'bg-coral/20 text-coral' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ad.status === 'approved' ? '승인' : ad.status === 'rejected' ? '거부' : '검토중'}
                    </span>
                    <span className="text-[10px] text-gray-400">{ad.type === 'main_banner' ? '메인 배너' : `카테고리 (${ad.category})`}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{ad.title}</p>
                  {ad.adminNote && <p className="text-[10px] text-coral mt-0.5">{ad.adminNote}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* 광고 신청 Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-0">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdModal(false)} />
          <div className="relative bg-white rounded-t-2xl p-6 w-full max-w-lg border-t border-gray-200 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">광고 신청</h3>
            <p className="text-xs text-gray-400 mb-5">신청 후 관리자 검토를 거쳐 승인됩니다.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">광고 위치</label>
                <div className="flex gap-2">
                  <button onClick={() => setAdForm({ ...adForm, type: 'main_banner', category: '' })} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${adForm.type === 'main_banner' ? 'bg-accent/10 border-accent text-accent' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    메인 배너
                  </button>
                  <button onClick={() => setAdForm({ ...adForm, type: 'category' })} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all border ${adForm.type === 'category' ? 'bg-accent/10 border-accent text-accent' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    카테고리
                  </button>
                </div>
              </div>

              {adForm.type === 'category' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">카테고리 선택</label>
                  <select value={adForm.category} onChange={(e) => setAdForm({ ...adForm, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none">
                    <option value="">선택하세요</option>
                    <option value="used">중고장터</option>
                    <option value="rental">렌탈</option>
                    <option value="lesson">레슨</option>
                    <option value="accommodation">숙소</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">광고 제목 *</label>
                <input value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="예: 보드팩토리 강남점" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">광고 설명 *</label>
                <input value={adForm.description} onChange={(e) => setAdForm({ ...adForm, description: e.target.value })} placeholder="예: 시즌 오픈 전 장비 튜닝 50% 할인" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">연결 URL *</label>
                <input value={adForm.url} onChange={(e) => setAdForm({ ...adForm, url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">추가 메모 (선택)</label>
                <textarea value={adForm.message} onChange={(e) => setAdForm({ ...adForm, message: e.target.value })} placeholder="광고 기간, 예산, 요청사항 등" rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowAdModal(false); setAdForm({ type: 'main_banner', category: '', title: '', description: '', url: '', message: '' }); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-200">취소</button>
              <button onClick={handleAdSubmit} disabled={adSubmitting} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors disabled:opacity-30">
                {adSubmitting ? '신청 중...' : '신청하기'}
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
            <p className="text-xs text-gray-400 mb-5">{t('mypage.selectCert')}</p>

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
                <p className="text-xs text-gray-400 text-center py-4">{t('mypage.allBadgesApplied')}</p>
              )}
            </div>

            {selectedBadge && (
              <div className="bg-gray-100 rounded-lg p-3 mb-5 border border-gray-300">
                <p className="text-[11px] text-gray-400 mb-2">{t('mypage.uploadCertPhoto')}</p>
                <label className="block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-accent/50 hover:text-accent-light transition-all">
                  {badgeImage ? badgeImage.name : t('mypage.selectPhoto')}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setBadgeImage(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowBadgeModal(false); setSelectedBadge(''); setBadgeImage(null); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors">{t('btn.cancel')}</button>
              <button onClick={handleRequestBadge} disabled={!selectedBadge || submitting} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
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
