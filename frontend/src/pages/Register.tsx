import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api, setAuth } from '../api';
import LegalSheet from '../components/LegalSheet';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // ?ref=CODE — 추천 링크로 들어왔을 때 자동 채움
  const refFromUrl = searchParams.get('ref') || '';
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', name: '', nickname: '', phone: '', referralCode: refFromUrl });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [legalSheet, setLegalSheet] = useState<'terms' | 'privacy' | null>(null);
  // 추천 코드 검증 상태: idle(입력 전) | checking | valid | invalid | format
  const [refStatus, setRefStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'format'>('idle');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // 추천 코드 라이브 검증 — 300ms 디바운스. 빈 값이면 idle.
  // 양쪽 500P 보너스 정책에 맞춰 잘못된 코드는 가입 단계 전에 알려줌.
  useEffect(() => {
    const raw = form.referralCode.trim();
    if (!raw) { setRefStatus('idle'); setReferrerName(null); return; }
    const code = raw.toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      setRefStatus('format'); setReferrerName(null); return;
    }
    setRefStatus('checking');
    const t = setTimeout(() => {
      api<{ referrerName?: string }>(`/referral/lookup/${encodeURIComponent(code)}`)
        .then(d => {
          if (d?.referrerName) {
            setRefStatus('valid');
            setReferrerName(d.referrerName);
          } else {
            setRefStatus('invalid');
            setReferrerName(null);
          }
        })
        .catch(() => { setRefStatus('invalid'); setReferrerName(null); });
    }, 300);
    return () => clearTimeout(t);
  }, [form.referralCode]);
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

    // 비밀번호 정책: 8자 이상 + 영문 + 숫자 (특수문자는 권장이지만 강제 X — 외국인 사용자 키보드 부담)
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.');
      return;
    }

    // 한국 휴대폰 형식 (01[016789]xxxxxxxx, 하이픈 허용)
    const phoneClean = form.phone.replace(/[-\s]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(phoneClean)) {
      setError('올바른 휴대폰 번호 형식이 아닙니다. (예: 01012345678)');
      return;
    }

    // 추천 코드 입력했는데 유효 안 하면 가입 차단 (양쪽 500P 정책 — 실제 가입자만 인정).
    if (form.referralCode.trim() && refStatus !== 'valid') {
      if (refStatus === 'checking') {
        setError('추천 코드 확인 중이에요. 잠시만 기다려주세요.');
      } else if (refStatus === 'format') {
        setError('추천 코드는 영문/숫자 4~12자만 입력 가능해요.');
      } else {
        setError('존재하지 않는 추천 코드예요. 정확한 코드를 입력하거나 비워두세요.');
      }
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; phone: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: { email: form.email, password: form.password, name: form.name, nickname: form.nickname || undefined, phone: form.phone, referralCode: form.referralCode || undefined },
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

  const inputClass = "w-full px-4 py-3 bg-snow border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

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
            <input
              id="reg-nickname"
              type="text"
              name="nickname"
              autoComplete="username"
              placeholder="2~20자 (선택)"
              minLength={2}
              maxLength={20}
              value={form.nickname}
              onChange={handleChange}
              className={inputClass}
            />
            <p className="text-[10px] text-gray-500 mt-1">2~20자, 다른 사용자와 중복 불가. 비워두면 이름이 표시됩니다.</p>
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-500 mb-2">이메일</label>
            <input id="reg-email" type="email" name="email" autoComplete="email" placeholder="이메일을 입력하세요" value={form.email} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-500 mb-2">전화번호</label>
            <input id="reg-phone" type="tel" name="phone" autoComplete="tel" placeholder="01012345678" pattern="01[016789][0-9]{7,8}" inputMode="numeric" maxLength={11} title="01x로 시작하는 휴대폰 번호 (하이픈 없이)" value={form.phone} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-500 mb-2">비밀번호</label>
            <div className="relative">
              <input id="reg-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" placeholder="영문+숫자 8자 이상" minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="영문과 숫자를 포함해 8자 이상" value={form.password} onChange={handleChange} required className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'} className="absolute right-2 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.79 20.79 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.6 20.6 0 0 1-3.06 4.06M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-gray-500 mb-2">비밀번호 확인</label>
            <div className="relative">
              <input id="reg-password-confirm" type={showPasswordConfirm ? 'text' : 'password'} name="passwordConfirm" autoComplete="new-password" placeholder="비밀번호를 다시 입력하세요" minLength={8} value={form.passwordConfirm} onChange={handleChange} required className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPasswordConfirm(v => !v)} aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 표시'} className="absolute right-2 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                {showPasswordConfirm ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.79 20.79 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.6 20.6 0 0 1-3.06 4.06M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* 추천 코드 (선택) — 입력 시 양쪽 500P 보너스 */}
          <div>
            <label htmlFor="reg-ref" className="block text-sm font-medium text-gray-500 mb-2">
              추천 코드 <span className="text-xs text-gray-500">(선택)</span>
            </label>
            <input
              id="reg-ref"
              type="text"
              name="referralCode"
              placeholder="실제 가입자 코드 입력"
              value={form.referralCode}
              onChange={handleChange}
              className={`${inputClass} ${
                refStatus === 'invalid' || refStatus === 'format' ? 'border-coral focus:border-coral' :
                refStatus === 'valid' ? 'border-emerald-500 focus:border-emerald-500' : ''
              }`}
              autoCapitalize="characters"
              aria-invalid={refStatus === 'invalid' || refStatus === 'format'}
            />
            {/* 안내 — 양쪽 500P */}
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              입력하면 <strong className="text-gray-900">나와 추천인 양쪽에 500P씩</strong> 적립돼요 (실제 가입자 코드만 인정).
            </p>
            {/* 라이브 검증 상태 */}
            {refStatus === 'checking' && (
              <p className="text-[11px] text-gray-500 mt-1">확인 중…</p>
            )}
            {refStatus === 'valid' && referrerName && (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                ✓ {referrerName}님의 추천 — 가입 시 +500P 추가
              </p>
            )}
            {refStatus === 'invalid' && (
              <p className="text-[11px] text-coral mt-1">존재하지 않는 추천 코드예요.</p>
            )}
            {refStatus === 'format' && (
              <p className="text-[11px] text-coral mt-1">영문/숫자 4~12자만 가능해요.</p>
            )}
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
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalSheet('terms'); }} className="text-[10px] text-gray-500 underline flex-shrink-0">보기</button>
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
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalSheet('privacy'); }} className="text-[10px] text-gray-500 underline flex-shrink-0">보기</button>
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

      <LegalSheet type={legalSheet} onClose={() => setLegalSheet(null)} />
    </div>
  );
};

export default Register;
