import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nickname: '',
    displayName: 'name' as 'name' | 'nickname',
    profileImage: '' as string,
  });

  const user = getUser();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api<{ nickname?: string; displayName?: string; profileImage?: string }>('/auth/profile').then(data => {
      setForm({
        nickname: data.nickname || '',
        displayName: (data.displayName as 'name' | 'nickname') || 'name',
        profileImage: data.profileImage || '',
      });
      if (data.profileImage) setProfilePreview(data.profileImage);
    }).catch(() => {});
  }, [navigate, user]);

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (form.displayName === 'nickname' && !form.nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      let profileImage = form.profileImage;
      if (profileFile) {
        const urls = await uploadImages([profileFile]);
        profileImage = urls[0];
      }
      const updated = await api<Record<string, unknown>>('/auth/profile', {
        method: 'PUT',
        body: { nickname: form.nickname.trim(), displayName: form.displayName, profileImage },
      });
      localStorage.setItem('user', JSON.stringify(updated));
      alert('프로필이 수정되었습니다.');
      navigate('/mypage');
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">프로필 수정</h1>
      </div>

      {/* Profile Image */}
      <div className="card p-5 flex flex-col items-center gap-3">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-4xl overflow-hidden group-hover:border-accent transition-colors">
            {profilePreview ? (
              <img src={profilePreview} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              '👤'
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center text-sm border-2 border-white">
            📷
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfileImage} />
        </label>
        <p className="text-xs text-gray-400">사진을 클릭하여 변경</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
          <input type="text" value={user?.name || ''} disabled className={`${inputClass} opacity-50`} />
          <p className="text-[10px] text-gray-400 mt-1">이름은 변경할 수 없습니다</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임</label>
          <input type="text" value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} placeholder="닉네임을 입력하세요" maxLength={20} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">표시 이름</label>
          <p className="text-xs text-gray-400 mb-2">다른 사용자에게 보이는 이름을 선택하세요</p>
          <div className="flex gap-2">
            <button onClick={() => setForm({...form, displayName: 'name'})} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.displayName === 'name' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
              실명 ({user?.name})
            </button>
            <button onClick={() => setForm({...form, displayName: 'nickname'})} disabled={!form.nickname.trim()} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.displayName === 'nickname' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'} disabled:opacity-30`}>
              닉네임 {form.nickname ? `(${form.nickname})` : ''}
            </button>
          </div>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm transition-colors active:scale-[0.98] disabled:opacity-50">
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </div>
  );
};

export default EditProfile;
