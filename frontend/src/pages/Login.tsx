import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveEmail, setSaveEmail] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setSaveEmail(true);
    }
    const auto = localStorage.getItem('autoLogin');
    if (auto === 'true') {
      setAutoLogin(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; phone: string; role: string; createdAt: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (saveEmail) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }

      if (autoLogin) {
        localStorage.setItem('autoLogin', 'true');
      } else {
        localStorage.removeItem('autoLogin');
      }

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인</h1>
          <p className="text-sm text-gray-400">스노우판에 오신 것을 환영합니다</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">이메일</label>
            <input type="email" placeholder="이메일을 입력하세요" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">비밀번호</label>
            <input type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={saveEmail} onChange={e => setSaveEmail(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-sky-500" />
              <span className="text-xs text-gray-500">아이디 저장</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoLogin} onChange={e => setAutoLogin(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-sky-500" />
              <span className="text-xs text-gray-500">자동 로그인</span>
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
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400">간편 로그인</span>
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
              카카오 로그인
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
              네이버 로그인
            </button>
          </div>
        </div>

        <div className="mt-4 text-center space-y-2">
          <Link to="/forgot-password" className="text-xs text-gray-400 hover:underline block">비밀번호를 잊으셨나요?</Link>
          <Link to="/register" className="text-xs text-primary-dark hover:underline block">계정이 없으신가요? 회원가입</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
