import { useState } from 'react';
import { api } from '../api';
import { toastSuccess, toastError } from './Toast';

// 위클리 다이제스트 구독 폼 — 비회원도 이메일만으로 구독 가능.
// 푸터 또는 홈에 배치. 동의는 "구독" 버튼 클릭 자체로 명시적 동의 처리.

interface Props {
  source?: string;
  className?: string;
}

export default function NewsletterSubscribe({ source = 'home', className = '' }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api('/newsletter/subscribe', { method: 'POST', body: { email: email.trim(), source } });
      setDone(true);
      setEmail('');
      toastSuccess('구독 신청이 완료되었습니다');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '구독 신청에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={`rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 ${className}`}>
        <p className="text-sm font-bold text-emerald-700">✓ 구독 신청 완료</p>
        <p className="text-xs text-emerald-600 mt-0.5">매주 인기 매물·후기·시즌 소식이 도착할 거예요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-2xl border border-gray-200 bg-snow px-4 py-3 ${className}`}>
      <p className="text-sm font-bold text-gray-900 mb-1">📬 위클리 스노우판</p>
      <p className="text-[11px] text-gray-500 mb-2.5 leading-tight">
        매주 인기 매물·후기·시즌 소식을 이메일로 받아보세요. 언제든 1-click 으로 해지 가능합니다.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="flex-1 min-h-11 px-3 py-2 rounded-lg text-sm bg-white border border-gray-300 focus:border-sky-400 outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="min-h-11 px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? '...' : '구독'}
        </button>
      </div>
    </form>
  );
}
