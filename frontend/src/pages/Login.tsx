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
    // 여기에 실제 SMS 인증 로직이 들어갈 예정
    setVerificationSent(true);
    alert('인증번호가 발송되었습니다.');
  };

  const handleVerifyCode = () => {
    // 여기에 실제 인증번호 확인 로직이 들어갈 예정
    setPhoneVerified(true);
    alert('인증이 완료되었습니다.');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isLogin ? '로그인' : '회원가입'}
          </h1>
          <p className="text-gray-600">
            스노우프라이스에 오신 것을 환영합니다
          </p>
        </div>

        <form className="space-y-4" onSubmit={isLogin ? handleLogin : handleSignup}>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                placeholder="홍길동"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={isLogin ? loginEmail : signupEmail}
              onChange={(e) => isLogin ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={isLogin ? loginPassword : signupPassword}
              onChange={(e) => isLogin ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  휴대폰 번호
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={phoneVerified}
                  />
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={phoneVerified}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      phoneVerified
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    {phoneVerified ? '인증완료' : '인증'}
                  </button>
                </div>
              </div>

              {verificationSent && !phoneVerified && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    인증번호
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="인증번호 6자리"
                      maxLength={6}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      확인
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    * 3분 이내에 인증번호를 입력해주세요
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary transition-colors disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-secondary font-medium"
          >
            {isLogin
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              비밀번호를 잊으셨나요?
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-4">
            소셜 로그인
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button className="py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">K</span>
            </button>
            <button className="py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">N</span>
            </button>
            <button className="py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">G</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
