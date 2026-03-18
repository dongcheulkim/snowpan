import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

type Step = 'email' | 'code' | 'password';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  const handleSendCode = async () => {
    if (!email) { setError('이메일을 입력하세요.'); return; }
    setError('');
    setLoading(true);
    try {
      await api('/auth/reset-password-request', { method: 'POST', body: { email } });
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!code || code.length !== 6) { setError('6자리 인증번호를 입력하세요.'); return; }
    setError('');
    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setError('');
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { email, code, newPassword } });
      alert('비밀번호가 변경되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 찾기</h1>
          <p className="text-sm text-gray-400">
            {step === 'email' && '가입한 이메일을 입력하세요'}
            {step === 'code' && '이메일로 전송된 인증번호를 입력하세요'}
            {step === 'password' && '새 비밀번호를 설정하세요'}
          </p>
        </div>

        <div className="space-y-4">
          {step === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">이메일</label>
                <input
                  type="email"
                  placeholder="가입한 이메일 입력"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              {error && <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>}
              <button onClick={handleSendCode} disabled={loading} className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors disabled:opacity-50">
                {loading ? '전송 중...' : '인증번호 전송'}
              </button>
            </>
          )}

          {step === 'code' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">인증번호 (6자리)</label>
                <input
                  type="text"
                  placeholder="인증번호 입력"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className={inputClass}
                />
              </div>
              {error && <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>}
              <button onClick={handleVerifyCode} className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors">
                다음
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">새 비밀번호</label>
                <input
                  type="password"
                  placeholder="새 비밀번호 (6자 이상)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">새 비밀번호 확인</label>
                <input
                  type="password"
                  placeholder="새 비밀번호 다시 입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {error && <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{error}</div>}
              <button onClick={handleResetPassword} disabled={loading} className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors disabled:opacity-50">
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-primary-dark hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
