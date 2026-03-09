import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userId === 'test' && password === 'test') {
      localStorage.setItem('user', JSON.stringify({ id: 'test', name: '테스트유저' }));
      navigate('/');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const inputClass = "w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none transition-all";

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">로그인</h1>
          <p className="text-sm text-zinc-500">스노우판에 오신 것을 환영합니다</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">아이디</label>
            <input type="text" placeholder="아이디를 입력하세요" value={userId} onChange={(e) => setUserId(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">비밀번호</label>
            <input type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>

          {error && (
            <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] mt-2">
            로그인
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-zinc-600">테스트 계정: test / test</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
