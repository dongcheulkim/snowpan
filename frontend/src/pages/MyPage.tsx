import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, setUser as saveUser, uploadImages, logout, imageUrl } from '../api';
import { CameraIcon, UserIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../components/Toast';
import { t } from '../i18n';

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
  const [user, setUser] = useState<{ id: string; name: string; nickname?: string; displayName?: string; email: string; role?: string; createdAt?: string; profileImage?: string; activeBadge?: string | null; provider?: string | null } | null>(null);
  const [badges, setBadges] = useState<BadgeRequest[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [hasPendingShop, setHasPendingShop] = useState(false);
  const [hasAgency, setHasAgency] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

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
    // 사장님 여부 조회 — 심사(승인) 통과한 매장이 있어야 '내 매장 관리' 메뉴 노출.
    // 심사 대기 중이면 메뉴는 아직 없지만 "심사중" 안내를 띄움.
    api<{ isOwner: boolean; hasPending: boolean }>('/auth/business-status')
      .then(d => { setIsOwner(!!d.isOwner); setHasPendingShop(!!d.hasPending); })
      .catch(() => {});
    // 여행사 보유 시 '여행사 관리' 메뉴 노출
    api<unknown[]>('/agencies/my').then(a => setHasAgency(Array.isArray(a) && a.length > 0)).catch(() => {});
  }, [navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const isSocialUser = !!user?.provider; // 카카오/네이버 계정 — 비밀번호가 없음

  const handleDeleteAccount = async () => {
    if (!isSocialUser && !deletePassword) { toastError('비밀번호를 입력해주세요.'); return; }
    setDeleting(true);
    try {
      await api('/auth/account', { method: 'DELETE', body: { password: deletePassword } });
      logout();
      toastSuccess('탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      navigate('/');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '탈퇴 처리에 실패했습니다.');
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
      toastError('사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const approvedBadges = badges.filter(b => b.status === 'approved');

  if (!user) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const menuItems = [
    { label: t('mypage.mySales'), link: '/mypage/sales' },
    { label: t('mypage.wishlist'), link: '/mypage/wishlist' },
    { label: '키워드 알림', link: '/mypage/keywords' },
    { label: t('mypage.recentlyViewed'), link: '/mypage/recent' },
    ...(isOwner ? [{ label: '내 매장 관리 (사장님)', link: '/mypage/shops' }] : []),
    ...(hasAgency ? [{ label: '여행사 관리', link: '/overseas/agency/manage' }] : []),
    { label: '광고 관리', link: '/mypage/ads' },
    { label: t('mypage.chatList'), link: '/chat/rooms' },
    { label: t('mypage.notifications'), link: '/notifications' },
  ];


  const settings = [
    // 이메일 계정만 — 소셜 계정은 비밀번호가 없음. (기존엔 어디에도 링크가 없어 페이지 도달 불가였음)
    ...(!isSocialUser ? [{ label: '비밀번호 변경', link: '/mypage/password' }] : []),
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
            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 overflow-hidden hover:border-gray-900 transition-colors">
              {uploadingPhoto ? (
                <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              ) : user.profileImage ? (
                <img src={imageUrl(user.profileImage)} alt="" className="w-full h-full object-cover" />
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
              {/* 이름 옆엔 사용자가 노출 선택한 뱃지(activeBadge) 하나만 */}
              {user.activeBadge && badgeDisplay[user.activeBadge] && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeDisplay[user.activeBadge].color}`}>
                  {badgeDisplay[user.activeBadge].label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {user.email?.endsWith('@social.local')
                ? (user.email.startsWith('naver_') ? '네이버 계정' : '카카오 계정')
                : (user.email || '')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { label: t('mypage.joinDate'), value: formatDate(user.createdAt) },
            { label: t('mypage.badges'), value: `${approvedBadges.length}개` },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2 bg-snow rounded-lg">
              <div className="text-base font-bold text-gray-900">{stat.value}</div>
              <div className="text-[10px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <Link to="/mypage/edit" className="block w-full text-center mt-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-200 transition-colors">
          프로필 수정
        </Link>
      </div>

      {/* 매장 심사중 — 등록했지만 아직 승인 전. 승인되면 '내 매장 관리' 메뉴가 열림 */}
      {hasPendingShop && !isOwner && (
        <Link to="/mypage/shops" className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div>
            <div className="text-sm font-bold text-gray-900">매장 심사 중</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              등록하신 매장을 확인하고 있어요. 승인되면 매장 관리가 열려요.
            </div>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>
      )}

      {/* Menu */}
      <div className="card overflow-hidden">
        {menuItems.map((item, idx) => (
          <Link key={item.link} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < menuItems.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            <span className="text-gray-500 text-xs">→</span>
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
          <Link to="/admin" className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block border-b border-gray-200">
            <span className="text-sm font-medium text-coral">{t('mypage.adminDashboard')}</span>
            <span className="text-coral text-xs">→</span>
          </Link>
          <Link to="/admin/overseas" className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block">
            <span className="text-sm font-medium text-coral">해외 스키 관리</span>
            <span className="text-coral text-xs">→</span>
          </Link>
        </div>
      )}

      {/* Settings */}
      <div className="card overflow-hidden">
        {settings.map((item, idx) => (
          <Link key={item.link} to={item.link} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-all block ${idx < settings.length - 1 ? 'border-b border-gray-200' : ''}`}>
            <span className="text-sm font-medium text-gray-500">{item.label}</span>
            <span className="text-gray-500 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-3.5 bg-snow text-gray-500 rounded-xl font-medium text-sm border border-gray-200 hover:bg-coral/10 hover:text-coral hover:border-coral/20 transition-all active:scale-[0.98]">
        {t('mypage.logout')}
      </button>

      {/* Account deletion */}
      <div className="text-center mt-3">
        <button
          onClick={() => { setDeletePassword(''); setShowDeleteModal(true); }}
          className="text-xs text-gray-500 hover:text-coral transition-colors underline underline-offset-2"
        >
          회원 탈퇴
        </button>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative bg-snow rounded-xl p-6 w-full max-w-sm border border-gray-300">
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
            {isSocialUser ? (
              // 소셜 계정은 비밀번호가 없음 — 입력 요구하면 탈퇴가 막혔음
              <p className="text-xs text-gray-500 mb-5">카카오/네이버 계정은 비밀번호 확인 없이 바로 탈퇴됩니다.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">계속하려면 비밀번호를 입력해주세요.</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-coral mb-5"
                  autoComplete="current-password"
                />
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || (!isSocialUser && !deletePassword)}
                className="flex-1 py-3 bg-coral text-white rounded-lg font-bold text-sm hover:bg-coral/90 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyPage;
