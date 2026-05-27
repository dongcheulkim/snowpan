import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getVerticalBySlug } from '../config/verticals';
import { useMeta } from '../hooks/useMeta';
import { api } from '../api';
import NotFound from './NotFound';

// 5개 미출시 vertical (bike/run/surf/golf/camp) Coming Soon 랜딩.
// 기획된 uniqueStrengths 카피를 보존하고 사전 가입 이메일을 수집.

const FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4'] as const;

interface FormState {
  email: string;
  name: string;
  features: string[];
  agreed: boolean;
}

const initialForm: FormState = { email: '', name: '', features: [], agreed: false };

function setRobotsNoIndex() {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  const prev = el.getAttribute('content') || '';
  el.setAttribute('content', 'noindex, follow');
  return () => {
    if (prev) el!.setAttribute('content', prev);
    else el!.remove();
  };
}

const COMING_SOON_SLUGS = ['bike', 'run', 'surf', 'golf', 'camp'];

export default function ComingSoon() {
  const location = useLocation();
  const slug = (location.pathname.split('/')[1] || '').toLowerCase();
  const vertical = COMING_SOON_SLUGS.includes(slug) ? getVerticalBySlug(slug) : undefined;

  useMeta({
    title: vertical ? `${vertical.name} — ${vertical.releaseDate || ''} 출시 예정` : '곧 출시',
    description: vertical ? `${vertical.name} — ${vertical.description} ${vertical.releaseDate || ''} 오픈 예정. 사전 알림 신청.` : '',
  });

  useEffect(() => {
    if (!vertical) return;
    return setRobotsNoIndex();
  }, [vertical]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!vertical) return <NotFound />;

  const accent = vertical.accentColor || '#0f172a';
  const strengths = vertical.uniqueStrengths || [];

  const toggleFeature = (label: string) => {
    setForm(f => f.features.includes(label)
      ? { ...f, features: f.features.filter(x => x !== label) }
      : { ...f, features: [...f.features, label] });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim()) { setError('이메일을 입력해주세요.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('올바른 이메일 형식이 아니에요.'); return; }
    if (!form.agreed) { setError('마케팅 알림 수신 동의가 필요해요.'); return; }
    setSubmitting(true);
    try {
      const res = await api<{ message: string }>('/pre-register', {
        method: 'POST',
        body: {
          email: form.email.trim(),
          name: form.name.trim() || undefined,
          sport: slug,
          interestedFeatures: form.features,
        },
      });
      setDone(res?.message || '신청 완료. 출시 시 가장 먼저 알려드릴게요!');
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 중 오류가 발생했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-10 animate-fade-in px-4">
      {/* Hero */}
      <header className="text-center space-y-3">
        <Link to="/pan" className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] text-gray-400 hover:text-gray-900">
          <span aria-hidden>←</span> PAN
        </Link>
        <div className="inline-flex items-center gap-2 mt-2">
          <span className="text-[10px] font-black tracking-[0.25em] px-2 py-1 rounded-full" style={{ background: `${accent}15`, color: accent }}>
            COMING SOON
          </span>
          {vertical.releaseDate && (
            <span className="text-[10px] font-bold tracking-wider text-gray-500">{vertical.releaseDate} 오픈 예정</span>
          )}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight pt-2" style={{ color: accent }}>
          {vertical.name}
        </h1>
        <p className="text-sm text-gray-700 font-medium">{vertical.tagline}</p>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">{vertical.description}</p>
      </header>

      {/* 강점 미리보기 */}
      {strengths.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">FEATURES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strengths.map((s, i) => (
              <div key={i} className="card p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                  <h3 className="text-sm font-bold text-gray-900">{s.label}</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 사전 가입 폼 */}
      <section className="card p-6 space-y-4">
        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">{done}</h2>
            <p className="text-xs text-gray-500">오픈 시 입력하신 이메일로 알려드릴게요.</p>
            <Link to="/snowpan" className="inline-block mt-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
              SNOWPAN 둘러보기 →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">오픈 알림 신청</h2>
              <p className="text-xs text-gray-500 mt-1">{vertical.name} 정식 오픈 시 가장 먼저 알려드려요.</p>
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-[11px] font-bold text-gray-700">이메일 *</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="mt-1 w-full px-3 py-2.5 bg-snow border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-gray-700">이름 (선택)</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                  className="mt-1 w-full px-3 py-2.5 bg-snow border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-900 transition-colors"
                />
              </label>
            </div>
            {strengths.length > 0 && (
              <fieldset>
                <legend className="text-[11px] font-bold text-gray-700 mb-2">가장 기대되는 기능 (복수 선택)</legend>
                <div className="grid grid-cols-1 gap-1.5">
                  {strengths.map((s, i) => (
                    <label key={`${FEATURE_KEYS[i] || i}`} className="flex items-center gap-2 px-3 py-2 bg-snow border border-gray-200 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.features.includes(s.label)}
                        onChange={() => toggleFeature(s.label)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-gray-700">{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.agreed}
                onChange={e => setForm({ ...form, agreed: e.target.checked })}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-[11px] text-gray-600 leading-relaxed">
                마케팅 알림 수신 동의 (<Link to="/privacy" className="underline">개인정보처리방침</Link>)
              </span>
            </label>
            {error && <p className="text-xs text-coral">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ background: accent }}
              className="w-full px-5 py-3 text-white rounded-lg font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {submitting ? '신청 중...' : '알림 신청'}
            </button>
          </form>
        )}
      </section>

      {/* SNOWPAN 프로모 */}
      <section className="card p-5 flex items-center justify-between gap-3 bg-snow">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900">이번 시즌은 SNOWPAN에서 만나요</p>
          <p className="text-[11px] text-gray-500 mt-0.5">스키·보드 중고거래·렌탈·레슨·숙소 운영 중</p>
        </div>
        <Link to="/snowpan" className="flex-shrink-0 px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">
          SNOWPAN →
        </Link>
      </section>
    </div>
  );
}
