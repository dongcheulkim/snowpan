import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, setAuth, isPersistentLogin, markLastLogin, getLastLogin, startSocialLogin, isNativeApp, setAppRefreshToken, signInWithApple } from '../api';
import { initPush } from '../push';
import { Capacitor } from '@capacitor/core';
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
  const [lastLogin] = useState(() => getLastLogin());
  // 카카오 로그인이 메인. 이메일 로그인은 접어두고 하단 링크로만 펼침(관리자·기존 이메일 유저용).
  const [showEmail, setShowEmail] = useState(false);

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

  // 소셜 로그인 콜백 실패 시 백엔드가 ?social_error= 로 되돌려보냄.
  useEffect(() => {
    const se = searchParams.get('social_error');
    if (se) setError(se);
  }, [searchParams]);

  // 초대 링크(/login?ref=코드)로 진입 시 추천 코드 보관 — 소셜 로그인 리다이렉트 후 온보딩에서 적용.
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      try { sessionStorage.setItem('snowpan.ref', ref); } catch { /* private mode */ }
    }
  }, [searchParams]);

  // 소셜 로그인 시작 — 로그인 후 돌아올 경로 저장 후 OAuth 시작(앱=인앱브라우저, 웹=현재창).
  const startSocial = (provider: 'kakao' | 'naver') => {
    try {
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '';
      if (safeNext) sessionStorage.setItem('snowpan.oauthNext', safeNext);
    } catch { /* ignore */ }
    startSocialLogin(provider);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api<{ token: string; refreshToken?: string; user: { id: string; email: string; name: string; phone: string; role: string; createdAt: string } }>('/auth/login', {
        method: 'POST',
        // 앱은 platform=app 을 보내 refresh 토큰을 body 로 받음 (웹뷰엔 쿠키가 안 심겨 지속 로그인 불가였음)
        body: { email, password, remember: autoLogin, ...(isNativeApp() ? { platform: 'app' } : {}) },
      });

      setAuth(data.token, data.user, autoLogin);
      if (data.refreshToken) setAppRefreshToken(data.refreshToken); // 앱 지속 로그인
      markLastLogin('email');
      initPush().catch(() => {}); // 앱: 이메일 로그인도 FCM 등록 (웹 no-op)

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

  // Apple 로그인 — iOS 앱에서만 (앱스토어 심사 지침 4.8: 카카오 로그인이 있으면 Apple 로그인도 제공). 웹·안드로이드엔 안 보임.
  const showApple = isNativeApp() && Capacitor.getPlatform() === 'ios';
  const [appleLoading, setAppleLoading] = useState(false);
  const handleApple = async () => {
    setError('');
    setAppleLoading(true);
    try {
      const data = await signInWithApple();
      setAuth(data.token, data.user, true);
      if (data.refreshToken) setAppRefreshToken(data.refreshToken);
      markLastLogin('apple');
      initPush().catch(() => {});
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      // 신규(또는 닉네임 미설정)면 온보딩 — 카카오 콜백과 같은 흐름
      if (data.isNew || !data.user?.nickname) navigate('/welcome', { replace: true });
      else navigate(safeNext, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // 시트에서 사용자가 취소한 경우(ASAuthorizationError 1001)는 조용히
      if (!/cancel|1001|취소/i.test(msg)) setError(msg || 'Apple 로그인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setAppleLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-snow border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  // "최근 로그인" 배지 — 마지막에 사용한 로그인 방식 버튼 위에 표시.
  const LastBadge = () => (
    <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold shadow-sm whitespace-nowrap pointer-events-none">
      {t('login.lastUsed')}
    </span>
  );

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('login.title')}</h1>
          <p className="text-sm text-gray-500">{t('login.welcome')}</p>
        </div>

        {/* 간편 로그인 (메인) — 처음이면 자동 가입, 있으면 로그인 */}
        <div className="space-y-3">
          <button
            onClick={() => startSocial('kakao')}
            className="relative w-full py-3.5 rounded-lg font-bold text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FEE500', color: '#000000' }}
          >
            {lastLogin === 'kakao' && <LastBadge />}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-5.088 0-9.2 3.272-9.2 7.313 0 2.604 1.716 4.9 4.318 6.195-.19.71-.69 2.577-.79 2.975-.124.496.18.49.38.355.157-.105 2.5-1.7 3.533-2.392.572.083 1.158.126 1.759.126 5.088 0 9.2-3.272 9.2-7.313S17.088 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </button>
          {showApple && (
            // 애플 버튼 디자인 지침: 검정 바탕·흰 글자·Apple 로고 필수 ("Apple로 로그인" 문구는 애플 공식 한국어 표기)
            <button
              onClick={handleApple}
              disabled={appleLoading}
              className="relative w-full py-3.5 rounded-lg font-bold text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
            >
              {lastLogin === 'apple' && <LastBadge />}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
              </svg>
              {appleLoading ? '확인 중...' : 'Apple로 로그인'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">처음이신가요? {showApple ? '카카오나 Apple로 바로 가입돼요.' : '카카오로 바로 가입돼요.'}</p>

        {error && !showEmail && (
          <div className="mt-4 text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* 이메일 로그인 — 관리자·기존 이메일 가입자용 (기본 숨김) */}
        <div className="mt-6">
          {!showEmail ? (
            <div className="text-center">
              <button type="button" onClick={() => setShowEmail(true)} className="text-xs text-gray-400 underline underline-offset-4 hover:text-gray-600">
                이메일로 로그인
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-snow text-gray-500">이메일 로그인</span></div>
              </div>
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
                className="relative w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                {lastLogin === 'email' && <LastBadge />}
                {loading ? t('login.loggingIn') : t('login.submit')}
              </button>

              <div className="text-center">
                <Link to="/forgot-password" className="inline-block text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900">
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
