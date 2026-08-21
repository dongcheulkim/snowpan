import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, setUser } from '../api';
import LegalSheet from '../components/LegalSheet';

// 신규 소셜 가입자 첫 로그인 온보딩 — 닉네임 설정 + 약관 동의.
// 소셜 로그인은 이메일 가입 폼을 안 거치므로 여기서 닉네임·약관을 마무리한다.
const Welcome = () => {
  const navigate = useNavigate();
  const user = getUser() as { name?: string; nickname?: string } | null;

  const [nickname, setNickname] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [sheet, setSheet] = useState<'terms' | 'privacy' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    // 카카오/네이버 닉네임을 기본값으로 제안 (사용자가 바꿀 수 있음).
    if (user.name) setNickname(user.name.slice(0, 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = nickname.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 20 && agreeTerms && agreePrivacy;

  const submit = async () => {
    if (!valid || loading) return;
    setError('');
    setLoading(true);
    try {
      const updated = await api<Record<string, unknown>>('/auth/profile', {
        method: 'PUT',
        body: { nickname: trimmed },
      });
      setUser(updated);

      // 로그인 전 가려던 경로 복원, 없으면 홈.
      let dest = '/';
      try {
        const saved = sessionStorage.getItem('snowpan.oauthNext');
        if (saved && saved.startsWith('/') && !saved.startsWith('//')) dest = saved;
        sessionStorage.removeItem('snowpan.oauthNext');
      } catch { /* ignore */ }
      navigate(dest, { replace: true });
    } catch (err) {
      // 닉네임 중복·길이 등 백엔드 메시지 그대로 노출.
      setError(err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const checkboxClass = "w-4 h-4 rounded border-gray-300 accent-sky-500 shrink-0";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">환영해요!</h1>
          <p className="text-sm text-gray-500">가입 축하 1,000P가 지급됐어요.<br />마지막으로 닉네임만 정하면 끝이에요.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2~20자로 입력해주세요"
              maxLength={20}
              className="w-full px-4 py-3 bg-snow border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
            <p className="text-xs text-gray-400 mt-1.5">스노우판에서 활동할 때 표시되는 이름이에요.</p>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className={checkboxClass} />
              <span className="text-sm text-gray-600">
                <button type="button" onClick={() => setSheet('terms')} className="underline underline-offset-2 text-gray-800">이용약관</button>
                에 동의합니다 <span className="text-coral">(필수)</span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className={checkboxClass} />
              <span className="text-sm text-gray-600">
                <button type="button" onClick={() => setSheet('privacy')} className="underline underline-offset-2 text-gray-800">개인정보처리방침</button>
                에 동의합니다 <span className="text-coral">(필수)</span>
              </span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!valid || loading}
            className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] mt-2 disabled:opacity-40"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </div>
      </div>

      <LegalSheet type={sheet} onClose={() => setSheet(null)} />
    </div>
  );
};

export default Welcome;
