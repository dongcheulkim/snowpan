import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuth } from '../api';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', name: '', nickname: '', phone: '' });
  const [agree, setAgree] = useState({ all: false, terms: false, privacy: false, marketing: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAgreeAll = (checked: boolean) => {
    setAgree({ all: checked, terms: checked, privacy: checked, marketing: checked });
  };

  const handleAgreeItem = (key: 'terms' | 'privacy' | 'marketing', checked: boolean) => {
    const next = { ...agree, [key]: checked };
    next.all = next.terms && next.privacy && next.marketing;
    setAgree(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agree.terms || !agree.privacy) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; phone: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: { email: form.email, password: form.password, name: form.name, nickname: form.nickname || undefined, phone: form.phone },
      });

      // 회원가입 직후엔 탭 세션만 유지 (자동로그인은 사용자가 명시적으로 로그인 시 켜도록)
      setAuth(data.token, data.user, false);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
          <p className="text-sm text-gray-500">스노우판에 가입하세요</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-500 mb-2">이름</label>
            <input id="reg-name" type="text" name="name" autoComplete="name" placeholder="실명을 입력하세요" value={form.name} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-nickname" className="block text-sm font-medium text-gray-500 mb-2">닉네임 <span className="text-xs text-gray-500">(다른 유저에게 보이는 이름)</span></label>
            <input id="reg-nickname" type="text" name="nickname" autoComplete="username" placeholder="닉네임을 입력하세요" value={form.nickname} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-500 mb-2">이메일</label>
            <input id="reg-email" type="email" name="email" autoComplete="email" placeholder="이메일을 입력하세요" value={form.email} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-500 mb-2">전화번호</label>
            <input id="reg-phone" type="tel" name="phone" autoComplete="tel" placeholder="01012345678" value={form.phone} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-500 mb-2">비밀번호</label>
            <input id="reg-password" type="password" name="password" autoComplete="new-password" placeholder="6자 이상 입력하세요" value={form.password} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-gray-500 mb-2">비밀번호 확인</label>
            <input id="reg-password-confirm" type="password" name="passwordConfirm" autoComplete="new-password" placeholder="비밀번호를 다시 입력하세요" value={form.passwordConfirm} onChange={handleChange} required className={inputClass} />
          </div>

          {/* 약관 동의 */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* 전체 동의 */}
            <label className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 cursor-pointer border-b border-gray-200">
              <input
                type="checkbox"
                checked={agree.all}
                onChange={(e) => handleAgreeAll(e.target.checked)}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-900">전체 동의</span>
            </label>

            {/* 이용약관 */}
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agree.terms}
                  onChange={(e) => handleAgreeItem('terms', e.target.checked)}
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
                <span className="text-xs text-gray-700">[필수] 이용약관 동의</span>
              </div>
              <Link to="/terms" target="_blank" className="text-[10px] text-gray-500 hover:underline flex-shrink-0">보기</Link>
            </label>

            {/* 개인정보처리방침 */}
            <label className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={agree.privacy}
                  onChange={(e) => handleAgreeItem('privacy', e.target.checked)}
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
                <span className="text-xs text-gray-700">[필수] 개인정보처리방침 동의</span>
              </div>
              <Link to="/privacy" target="_blank" className="text-[10px] text-gray-500 hover:underline flex-shrink-0">보기</Link>
            </label>

            {/* 마케팅 수신 */}
            <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agree.marketing}
                onChange={(e) => handleAgreeItem('marketing', e.target.checked)}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
              <span className="text-xs text-gray-500">[선택] 마케팅 수신 동의 (이벤트·혜택 알림)</span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] mt-2 disabled:opacity-50"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-primary-dark hover:underline">이미 계정이 있으신가요? 로그인</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
