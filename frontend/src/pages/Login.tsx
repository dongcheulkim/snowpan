import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, setAuth, isPersistentLogin } from '../api';
import { t, onLangChange } from '../i18n';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setSaveEmail(true);
    }
    if (isPersistentLogin()) setAutoLogin(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; phone: string; role: string; createdAt: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password, remember: autoLogin },
      });

      setAuth(data.token, data.user, autoLogin);

      if (saveEmail) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }

      // open redirect 방지: 외부 URL/프로토콜 차단, 내부 경로만 허용.
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      navigate(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-snow border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('login.title')}</h1>
          <p className="text-sm text-gray-500">{t('login.welcome')}</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">{t('login.email')}</label>
            <input type="email" inputMode="email" autoComplete="username" placeholder={t('login.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">{t('login.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.79 20.79 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.6 20.6 0 0 1-3.06 4.06M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={saveEmail} onChange={e => setSaveEmail(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-sky-500" />
              <span className="text-xs text-gray-500">{t('login.saveEmail')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoLogin} onChange={e => setAutoLogin(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-sky-500" />
              <span className="text-xs text-gray-500">{t('login.autoLogin')}</span>
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
            {loading ? t('login.loggingIn') : t('login.submit')}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-snow text-gray-500">{t('login.socialLogin')}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                alert('카카오 로그인은 API 키 설정 후 사용 가능합니다.\n관리자에게 KAKAO_CLIENT_ID 설정을 요청하세요.');
              }}
              className="flex-1 py-3 rounded-lg font-bold text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FEE500', color: '#000000' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-5.088 0-9.2 3.272-9.2 7.313 0 2.604 1.716 4.9 4.318 6.195-.19.71-.69 2.577-.79 2.975-.124.496.18.49.38.355.157-.105 2.5-1.7 3.533-2.392.572.083 1.158.126 1.759.126 5.088 0 9.2-3.272 9.2-7.313S17.088 3 12 3z"/>
              </svg>
              {t('login.kakao')}
            </button>
            <button
              onClick={() => {
                alert('네이버 로그인은 API 키 설정 후 사용 가능합니다.\n관리자에게 NAVER_CLIENT_ID 설정을 요청하세요.');
              }}
              className="flex-1 py-3 rounded-lg font-bold text-sm text-white transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: '#03C75A' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" transform="scale(0.75) translate(4,4)"/>
              </svg>
              {t('login.naver')}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center space-y-3">
          <Link to="/forgot-password" className="inline-block text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900">
            {t('login.forgotPassword')}
          </Link>
          <div className="h-px bg-gray-100" />
          <Link to="/register" className="block text-sm font-bold text-primary-dark hover:underline">
            {t('login.noAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
