import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // 로그인 폼
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 폼
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('로그인 성공!');
        navigate('/');
      } else {
        alert(data.error || '로그인 실패');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== signupPasswordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!phoneVerified) {
      alert('휴대폰 인증을 완료해주세요.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          phone: signupPhone,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('회원가입 성공! 로그인해주세요.');
        setIsLogin(true);
      } else {
        alert(data.error || '회원가입 실패');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = () => {
    setVerificationSent(true);
    alert('인증번호가 발송되었습니다.');
  };

  const handleVerifyCode = () => {
    setPhoneVerified(true);
    alert('인증이 완료되었습니다.');
  };

  const inputClass = "w-full px-4 py-3 bg-dark-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/50 transition-all";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="glass rounded-2xl p-8 neon-border">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⛷️</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? '로그인' : '회원가입'}
          </h1>
          <p className="text-sm text-gray-400">
            스노우판에 오신 것을 환영합니다
          </p>
        </div>

        <form className="space-y-4" onSubmit={isLogin ? handleLogin : handleSignup}>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이름
              </label>
              <input
                type="text"
                placeholder="홍길동"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              이메일
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={isLogin ? loginEmail : signupEmail}
              onChange={(e) => isLogin ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={isLogin ? loginPassword : signupPassword}
              onChange={(e) => isLogin ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  휴대폰 번호
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    className={`flex-1 ${inputClass}`}
                    disabled={phoneVerified}
                  />
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={phoneVerified}
                    className={`px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                      phoneVerified
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:shadow-lg hover:shadow-neon-blue/25'
                    }`}
                  >
                    {phoneVerified ? '완료' : '인증'}
                  </button>
                </div>
              </div>

              {verificationSent && !phoneVerified && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    인증번호
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="인증번호 6자리"
                      maxLength={6}
                      className={`flex-1 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-5 py-3 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-neon-green/25 transition-all"
                    >
                      확인
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * 3분 이내에 인증번호를 입력해주세요
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-neon-blue/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                처리 중...
              </span>
            ) : (
              isLogin ? '로그인' : '회원가입'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-neon-blue hover:text-neon-blue/80 font-medium transition-colors"
          >
            {isLogin
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-3 text-center">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              비밀번호를 잊으셨나요?
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-center text-xs text-gray-500 mb-4">
            소셜 로그인
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'K', color: 'from-yellow-500 to-yellow-600', hover: 'hover:shadow-yellow-500/25' },
              { label: 'N', color: 'from-green-500 to-green-600', hover: 'hover:shadow-green-500/25' },
              { label: 'G', color: 'from-blue-500 to-blue-600', hover: 'hover:shadow-blue-500/25' },
            ].map((social) => (
              <button
                key={social.label}
                className={`py-3 rounded-xl bg-gradient-to-r ${social.color} text-white font-bold text-lg transition-all ${social.hover} hover:shadow-lg active:scale-95`}
              >
                {social.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
