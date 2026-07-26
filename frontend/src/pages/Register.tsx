import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api, setAuth } from '../api';
import LegalSheet from '../components/LegalSheet';

// 한 질문씩 밀어내기(대화형) 회원가입. 이전 답은 위에 요약으로 쌓이고, 탭하면 수정.
type StepKey = 'name' | 'nickname' | 'email' | 'phone' | 'password' | 'referral' | 'terms';
const STEPS: StepKey[] = ['name', 'nickname', 'email', 'phone', 'password', 'referral', 'terms'];

const LABEL: Record<StepKey, string> = {
  name: '이름', nickname: '닉네임', email: '이메일', phone: '휴대폰', password: '비밀번호', referral: '추천코드', terms: '약관',
};

const QUESTION: Record<StepKey, { q: string; sub?: string }> = {
  name:     { q: '반가워요! 이름이 어떻게 되세요?', sub: '실명으로 입력해주세요' },
  nickname: { q: '닉네임을 정해주세요', sub: '다른 사람에게 보이는 이름이에요 (선택 · 비우면 이름 표시)' },
  email:    { q: '이메일 주소를 알려주세요', sub: '로그인할 때 사용해요' },
  phone:    { q: '휴대폰 번호는요?', sub: '하이픈 없이 (예: 01012345678)' },
  password: { q: '비밀번호를 만들어주세요', sub: '영문+숫자 포함 8자 이상' },
  referral: { q: '추천 코드가 있나요?', sub: '있으면 나와 추천인 양쪽에 500P! 없으면 넘어가도 돼요' },
  terms:    { q: '마지막이에요! 약관에 동의해주세요', sub: '' },
};

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') || '';
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', name: '', nickname: '', phone: '', referralCode: refFromUrl });
  const [showPassword, setShowPassword] = useState(false);
  const [legalSheet, setLegalSheet] = useState<'terms' | 'privacy' | null>(null);
  const [refStatus, setRefStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'format'>('idle');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [agree, setAgree] = useState({ all: false, terms: false, privacy: false, marketing: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 추천코드가 URL 로 들어왔으면 그 스텝을 건너뛰지 않되 자동 채움. 시작 스텝 0.
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 스텝 바뀔 때 입력창 자동 포커스.
  useEffect(() => { inputRef.current?.focus(); }, [step]);

  // 추천 코드 라이브 검증 (300ms 디바운스).
  useEffect(() => {
    const raw = form.referralCode.trim();
    if (!raw) { setRefStatus('idle'); setReferrerName(null); return; }
    const code = raw.toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { setRefStatus('format'); setReferrerName(null); return; }
    setRefStatus('checking');
    const t = setTimeout(() => {
      api<{ referrerName?: string }>(`/referral/lookup/${encodeURIComponent(code)}`)
        .then(d => {
          if (d?.referrerName) { setRefStatus('valid'); setReferrerName(d.referrerName); }
          else { setRefStatus('invalid'); setReferrerName(null); }
        })
        .catch(() => { setRefStatus('invalid'); setReferrerName(null); });
    }, 300);
    return () => clearTimeout(t);
  }, [form.referralCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const phoneClean = form.phone.replace(/[-\s]/g, '');

  // 현재 스텝 유효성 — 에러 문자열 or null.
  const validateStep = (key: StepKey): string | null => {
    switch (key) {
      case 'name':
        if (!form.name.trim()) return '이름을 입력해주세요.';
        return null;
      case 'nickname':
        if (form.nickname && (form.nickname.length < 2 || form.nickname.length > 20)) return '닉네임은 2~20자로 입력해주세요.';
        return null;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '올바른 이메일 형식이 아니에요.';
        return null;
      case 'phone':
        if (!/^01[016789]\d{7,8}$/.test(phoneClean)) return '올바른 휴대폰 번호가 아니에요. (예: 01012345678)';
        return null;
      case 'password':
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) return '영문과 숫자를 포함해 8자 이상이어야 해요.';
        if (form.password !== form.passwordConfirm) return '비밀번호가 일치하지 않아요.';
        return null;
      case 'referral':
        if (form.referralCode.trim() && refStatus !== 'valid') {
          if (refStatus === 'checking') return '추천 코드 확인 중이에요. 잠시만요.';
          if (refStatus === 'format') return '추천 코드는 영문/숫자 4~12자예요.';
          return '존재하지 않는 추천 코드예요. 정확히 입력하거나 비워두세요.';
        }
        return null;
      case 'terms':
        if (!agree.terms || !agree.privacy) return '필수 약관에 동의해주세요.';
        return null;
    }
  };

  const currentKey = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const advance = async () => {
    const err = validateStep(currentKey);
    if (err) { setError(err); return; }
    setError('');
    if (!isLast) { setStep(step + 1); return; }
    // 마지막 스텝 → 가입
    setLoading(true);
    try {
      const data = await api<{ token: string; user: { id: string; email: string; name: string; phone: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: { email: form.email, password: form.password, name: form.name, nickname: form.nickname || undefined, phone: form.phone, referralCode: form.referralCode || undefined },
      });
      setAuth(data.token, data.user, false);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); advance(); };

  const handleAgreeAll = (checked: boolean) => setAgree({ all: checked, terms: checked, privacy: checked, marketing: checked });
  const handleAgreeItem = (k: 'terms' | 'privacy' | 'marketing', checked: boolean) => {
    const next = { ...agree, [k]: checked };
    next.all = next.terms && next.privacy && next.marketing;
    setAgree(next);
  };

  // 완료된 스텝 요약값.
  const summaryValue = (key: StepKey): string => {
    switch (key) {
      case 'name': return form.name;
      case 'nickname': return form.nickname || '(건너뜀)';
      case 'email': return form.email;
      case 'phone': return form.phone;
      case 'password': return '••••••••';
      case 'referral': return form.referralCode ? form.referralCode.toUpperCase() : '(건너뜀)';
      case 'terms': return '동의 완료';
    }
  };

  const inputClass = "w-full px-4 py-3 bg-snow border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 transition-all";
  const progress = Math.round(((step) / (STEPS.length - 1)) * 100);

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-6 sm:p-8">
        {/* 진행바 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-900">회원가입</h1>
            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 완료된 스텝 — 위에 쌓임 (탭하면 수정) */}
        <div className="space-y-2 mb-4">
          {STEPS.slice(0, step).map((key, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => { setStep(idx); setError(''); }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 rounded-lg border border-gray-100 text-left hover:border-sky-200 transition-colors"
            >
              <span className="text-[11px] text-gray-400 flex-shrink-0">{LABEL[key]}</span>
              <span className="text-sm text-gray-800 font-medium truncate ml-3">{summaryValue(key)}</span>
            </button>
          ))}
        </div>

        {/* 현재 질문 — 밀고 올라옴 */}
        <form onSubmit={onSubmit} key={currentKey} className="animate-[slideUp_.28s_ease-out]">
          <style>{`@keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{QUESTION[currentKey].q}</h2>
            {QUESTION[currentKey].sub && <p className="text-xs text-gray-500 mt-1.5">{QUESTION[currentKey].sub}</p>}
          </div>

          {/* 스텝별 입력 */}
          {currentKey === 'name' && (
            <input ref={inputRef} type="text" name="name" autoComplete="name" placeholder="홍길동" value={form.name} onChange={handleChange} className={inputClass} />
          )}
          {currentKey === 'nickname' && (
            <input ref={inputRef} type="text" name="nickname" autoComplete="username" placeholder="2~20자 (선택)" maxLength={20} value={form.nickname} onChange={handleChange} className={inputClass} />
          )}
          {currentKey === 'email' && (
            <input ref={inputRef} type="email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className={inputClass} />
          )}
          {currentKey === 'phone' && (
            <input ref={inputRef} type="tel" name="phone" autoComplete="tel" inputMode="numeric" maxLength={11} placeholder="01012345678" value={form.phone} onChange={handleChange} className={inputClass} />
          )}
          {currentKey === 'password' && (
            <div className="space-y-2.5">
              <div className="relative">
                <input ref={inputRef} type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" placeholder="영문+숫자 8자 이상" value={form.password} onChange={handleChange} className={`${inputClass} pr-11`} />
                <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="비밀번호 표시" className="absolute right-2 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <input type={showPassword ? 'text' : 'password'} name="passwordConfirm" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={form.passwordConfirm} onChange={handleChange} className={inputClass} />
            </div>
          )}
          {currentKey === 'referral' && (
            <div>
              <input
                ref={inputRef}
                type="text"
                name="referralCode"
                placeholder="추천 코드 (없으면 넘어가기)"
                value={form.referralCode}
                onChange={handleChange}
                autoCapitalize="characters"
                className={`${inputClass} ${refStatus === 'invalid' || refStatus === 'format' ? 'border-coral' : refStatus === 'valid' ? 'border-emerald-500' : ''}`}
              />
              {refStatus === 'checking' && <p className="text-[11px] text-gray-500 mt-1.5">확인 중…</p>}
              {refStatus === 'valid' && referrerName && <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">{referrerName}님의 추천 — 가입 시 +500P</p>}
              {refStatus === 'invalid' && <p className="text-[11px] text-coral mt-1.5">존재하지 않는 추천 코드예요.</p>}
              {refStatus === 'format' && <p className="text-[11px] text-coral mt-1.5">영문/숫자 4~12자만 가능해요.</p>}
            </div>
          )}
          {currentKey === 'terms' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <label className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 cursor-pointer border-b border-gray-200">
                <input type="checkbox" checked={agree.all} onChange={(e) => handleAgreeAll(e.target.checked)} className="w-4 h-4 accent-sky-500" />
                <span className="text-sm font-bold text-gray-900">전체 동의</span>
              </label>
              <label className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={agree.terms} onChange={(e) => handleAgreeItem('terms', e.target.checked)} className="w-4 h-4 accent-sky-500" />
                  <span className="text-xs text-gray-700">[필수] 이용약관 동의</span>
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); setLegalSheet('terms'); }} className="text-[10px] text-gray-500 underline">보기</button>
              </label>
              <label className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={agree.privacy} onChange={(e) => handleAgreeItem('privacy', e.target.checked)} className="w-4 h-4 accent-sky-500" />
                  <span className="text-xs text-gray-700">[필수] 개인정보처리방침 동의</span>
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); setLegalSheet('privacy'); }} className="text-[10px] text-gray-500 underline">보기</button>
              </label>
              <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={agree.marketing} onChange={(e) => handleAgreeItem('marketing', e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
                <span>
                  <span className="text-xs text-gray-500">[선택] 마케팅 수신 동의 (이벤트·혜택 알림)</span>
                  <span className="block text-[11px] text-sky-500 mt-0.5">쓸데없는 광고는 안 보내요. 진짜 좋은 이벤트·혜택만 딱 알려드려요</span>
                </span>
              </label>
            </div>
          )}

          {error && <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2 mt-3">{error}</div>}

          <div className="flex gap-2 mt-5">
            {step > 0 && (
              <button type="button" onClick={() => { setStep(step - 1); setError(''); }} className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm border border-gray-200">이전</button>
            )}
            <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-50">
              {loading ? '가입 중...' : isLast ? '회원가입 완료' : '다음'}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-xs text-primary-dark hover:underline">이미 계정이 있으신가요? 로그인</Link>
        </div>
      </div>

      <LegalSheet type={legalSheet} onClose={() => setLegalSheet(null)} />
    </div>
  );
};

export default Register;
