import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, setUser, uploadImages, imageUrl } from '../api';
import { toastSuccess, toastError } from '../components/Toast';
import { CameraIcon, UserIcon } from '../components/Icons';

interface BadgeRequest { id: string; badgeType: string; status: string; image?: string }

const badgeDisplay: Record<string, { label: string; desc: string; color: string }> = {
  lv1: { label: 'LV1', desc: 'KSIA 레벨1', color: 'bg-green-500 text-white' },
  lv2: { label: 'LV2', desc: 'KSIA 레벨2', color: 'bg-accent text-white' },
  lv3: { label: 'LV3', desc: 'KSIA 레벨3', color: 'bg-purple-500 text-white' },
  demo: { label: '데몬', desc: '데몬스트레이터', color: 'bg-gold text-black' },
  teaching1: { label: '티칭1', desc: 'SBAK 티칭1', color: 'bg-blue-400 text-white' },
  teaching2: { label: '티칭2', desc: 'SBAK 티칭2', color: 'bg-blue-500 text-white' },
  teaching3: { label: '티칭3', desc: 'SBAK 티칭3', color: 'bg-blue-700 text-white' },
  pro: { label: '프로', desc: '프로 선수 / 강사', color: 'bg-coral text-white' },
  cert: { label: '인증', desc: '자격증 인증', color: 'bg-accent text-white' },
};

// 프로필 관리 — 사진·닉네임·인증뱃지를 한 곳에서.
const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [form, setForm] = useState({ nickname: '', profileImage: '' as string });

  const [badges, setBadges] = useState<BadgeRequest[]>([]);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [badgeSubmitting, setBadgeSubmitting] = useState(false);

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api<{ nickname?: string; profileImage?: string; activeBadge?: string | null }>('/auth/profile').then(data => {
      setForm({ nickname: data.nickname || '', profileImage: data.profileImage || '' });
      if (data.profileImage) setProfilePreview(data.profileImage);
      setActiveBadge(data.activeBadge || null);
    }).catch(() => {});
    api<BadgeRequest[]>('/auth/my-badges').then(setBadges).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const approvedBadges = badges.filter(b => b.status === 'approved');
  const pendingBadges = badges.filter(b => b.status === 'pending');

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    // 닉네임 규칙 사전 검증 — 백엔드와 동일 (한글/영문/숫자 2~20자).
    const nick = form.nickname.trim();
    if (nick && !/^[가-힣a-zA-Z0-9]{2,20}$/.test(nick)) {
      toastError('닉네임은 한글·영문·숫자 2~20자만 사용할 수 있어요.');
      return;
    }
    setLoading(true);
    let updated: Record<string, unknown> | null = null;
    try {
      let profileImage = form.profileImage;
      if (profileFile) {
        const urls = await uploadImages([profileFile]);
        profileImage = urls[0];
      }
      updated = await api<Record<string, unknown>>('/auth/profile', {
        method: 'PUT',
        body: { nickname: form.nickname.trim(), profileImage },
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : '수정에 실패했습니다.');
      setLoading(false);
      return;
    }
    setUser(updated!);
    toastSuccess('프로필이 수정되었습니다.');
    setLoading(false);
    navigate('/mypage');
  };

  // 자격증 사진 올려 인증 요청 (모달 없이 바로).
  const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    setBadgeSubmitting(true);
    try {
      const urls = await uploadImages([file]);
      await api('/auth/badge-request', { method: 'POST', body: { badgeType: 'cert', image: urls[0] } });
      const updated = await api<BadgeRequest[]>('/auth/my-badges');
      setBadges(updated);
      toastSuccess('인증 요청 완료! 관리자 확인 후 뱃지가 달려요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setBadgeSubmitting(false);
    }
  };

  const toggleBadge = async (badgeType: string) => {
    const next = activeBadge === badgeType ? null : badgeType;
    try {
      await api('/auth/profile', { method: 'PUT', body: { activeBadge: next } });
      setActiveBadge(next);
      if (user) setUser({ ...user, activeBadge: next });
      toastSuccess(next ? '뱃지를 노출합니다' : '뱃지 노출을 해제했습니다');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '뱃지 설정에 실패했습니다');
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">프로필 관리</h1>
      </div>

      {/* Profile Image */}
      <div className="card p-5 flex flex-col items-center gap-3">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-600 overflow-hidden group-hover:border-gray-900 transition-colors">
            {profilePreview ? (
              <img src={imageUrl(profilePreview)} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={44} />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center border-2 border-white">
            <CameraIcon size={16} strokeWidth={2} />
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfileImage} />
        </label>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">사진을 클릭하여 변경</p>
          {profilePreview && (
            <button
              type="button"
              onClick={() => { setProfilePreview(null); setProfileFile(null); setForm(f => ({ ...f, profileImage: '' })); }}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-coral"
            >사진 삭제</button>
          )}
        </div>
      </div>

      {/* 이름 / 닉네임 */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
          <input type="text" value={user?.name || ''} disabled className={`${inputClass} opacity-50`} />
          <p className="text-[10px] text-gray-500 mt-1">이름은 변경할 수 없습니다</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임</label>
          <input type="text" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="닉네임을 입력하세요" maxLength={20} className={inputClass} />
          <p className="text-[10px] text-gray-500 mt-1">닉네임을 입력하면 커뮤니티·거래 등에서 닉네임으로 표시됩니다</p>
        </div>
      </div>

      {/* 인증 뱃지 */}
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">인증 뱃지</h3>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            스키·보드 지도자/강사 <b>자격증</b>이 있으면 사진 한 장으로 인증하세요.
            프로필에 <span className="text-accent font-semibold">인증 뱃지</span>가 달려 레슨·거래 시 <b>신뢰도가 올라가요.</b>
          </p>
        </div>

        {(approvedBadges.length > 0 || pendingBadges.length > 0) && (
          <div className="space-y-2">
            {approvedBadges.map((b) => {
              const badge = badgeDisplay[b.badgeType]; if (!badge) return null;
              const isActive = activeBadge === b.badgeType;
              return (
                <div key={b.id} className={`flex items-center justify-between p-3 bg-snow rounded-lg border ${isActive ? 'border-sky-400 bg-sky-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${badge.color}`}>{badge.label}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-900">{badge.desc}</div>
                      <div className="text-[10px] text-mint">인증 완료</div>
                    </div>
                  </div>
                  <button onClick={() => toggleBadge(b.badgeType)} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${isActive ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {isActive ? '노출중' : '노출'}
                  </button>
                </div>
              );
            })}
            {pendingBadges.map((b) => {
              const badge = badgeDisplay[b.badgeType]; if (!badge) return null;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-snow rounded-lg border border-gray-200 opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-gray-400 text-white">심사중</span>
                    <div className="text-xs font-medium text-gray-900">자격증 확인 중</div>
                  </div>
                  <span className="text-[10px] text-yellow-500 font-medium">승인 대기</span>
                </div>
              );
            })}
          </div>
        )}

        <label className={`block w-full py-3 border-2 border-dashed border-accent/40 rounded-lg text-center text-sm font-bold text-accent transition-colors ${badgeSubmitting ? 'opacity-50' : 'cursor-pointer hover:bg-accent/5'}`}>
          {badgeSubmitting ? '인증 요청 중...' : '자격증 사진 올려 인증받기'}
          <input type="file" accept="image/*" className="hidden" disabled={badgeSubmitting} onChange={handleBadgeUpload} />
        </label>
        <p className="text-[10px] text-gray-400 text-center">사진을 올리면 관리자가 확인 후 뱃지를 달아드려요.</p>
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm transition-colors active:scale-[0.98] disabled:opacity-50">
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </div>
  );
};

export default EditProfile;
