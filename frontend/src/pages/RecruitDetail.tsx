import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getUser } from '../api';
import { useMeta } from '../hooks/useMeta';
import { loginPath } from '../utils/loginPath';
import ShareButton from '../components/ShareButton';
import { toastError, toastSuccess } from '../components/Toast';
import type { Recruit } from '../components/RecruitCard';

// 모집 상세 + 신청서 (/recruit/:id) — 인스타 등에 이 링크를 올리면 스노우판 가입 → 신청까지 이어진다. 2026-09-23
// 배지·명단은 없고, 신청서(이름·연락처·인스타·한마디)는 사장님·직원 대시보드에서만 본다.
type Detail = Recruit & { applied: boolean; canManage: boolean };
const SHOP_LABEL: Record<string, string> = { skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };

export default function RecruitDetail() {
  const { id } = useParams();
  const user = getUser();
  const [r, setR] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useMeta({ title: r ? `${r.shopName} ${r.title}` : '모집', description: r?.description.slice(0, 120) });

  useEffect(() => {
    if (!id) return;
    api<Detail>(`/recruits/${id}`).then(setR).catch((e) => setError(e instanceof Error ? e.message : '모집을 불러오지 못했어요.'));
  }, [id]);
  useEffect(() => {
    if (!user) return;
    setName((n) => n || user.nickname || user.name || '');
    setPhone((p) => p || user.phone || '');
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!id || busy) return;
    if (!name.trim()) { toastError('이름을 적어 주세요.'); return; }
    if (phone.replace(/\D/g, '').length < 9) { toastError('연락처를 정확히 적어 주세요.'); return; }
    setBusy(true);
    try {
      const res = await api<{ message: string }>(`/recruits/${id}/apply`, { method: 'POST', body: { name: name.trim(), phone: phone.trim(), instagram: instagram.trim() || undefined, message: message.trim() || undefined } });
      toastSuccess(res.message || '신청했어요.');
      setDone(true);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '신청하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };

  if (error) return (
    <div className="max-w-md mx-auto text-center py-20">
      <p className="text-sm text-gray-500 mb-3">{error}</p>
      <Link to="/" className="text-sm text-sky-600 underline">홈으로</Link>
    </div>
  );
  if (!r) return <div className="text-center py-20 text-sm text-gray-500">불러오는 중...</div>;

  const inputClass = 'w-full min-h-11 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400';
  const applied = done || r.applied;

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={r.shopPath} className="text-[11px] text-gray-500 underline underline-offset-2">{SHOP_LABEL[r.shopType] || '매장'} · {r.shopName}</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{r.title}</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">{r.active ? (r.deadline ? `${r.deadline.replace(/-/g, '.')}까지 신청` : '신청 받는 중') : '마감된 모집이에요'}</p>
          </div>
          <ShareButton title={`${r.shopName} ${r.title}`} text={r.description.slice(0, 80)} url={`${window.location.origin}/recruit/${r.id}`} />
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{r.description}</p>
      </div>

      {r.canManage ? (
        <Link to="/mypage/shops" className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-bold text-gray-900">신청자 확인은 사장님 대시보드에서</span>
          <span className="text-gray-500 text-xs">→</span>
        </Link>
      ) : !r.active ? null : !user ? (
        <div className="card p-5 text-center space-y-3">
          <p className="text-sm text-gray-700">스노우판에 로그인하면 바로 신청할 수 있어요. 카카오로 10초면 가입돼요.</p>
          <Link to={loginPath()} className="block w-full min-h-11 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">로그인하고 신청하기</Link>
        </div>
      ) : applied ? (
        <div className="card p-5 text-center space-y-1">
          <p className="text-sm font-bold text-gray-900">신청이 접수됐어요</p>
          <p className="text-xs text-gray-500">사장님이 확인하면 적어 주신 연락처로 연락드려요.</p>
        </div>
      ) : (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">신청서</h2>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">이름</label>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder="이름" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">연락처</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} inputMode="tel" placeholder="010-0000-0000" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">인스타그램 <span className="text-gray-400">(선택)</span></label>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value.slice(0, 40))} placeholder="@아이디" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">하고 싶은 말 <span className="text-gray-400">(선택)</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={4} maxLength={500} placeholder="경력, 타는 스타일, 활동 지역 등 자유롭게 적어 주세요." className={`${inputClass} resize-none`} />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{message.length}/500</p>
          </div>
          <p className="text-[11px] text-gray-500">적어 주신 연락처는 이 매장 사장님과 직원만 볼 수 있어요.</p>
          <button type="button" onClick={submit} disabled={busy} className="w-full min-h-11 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40">{busy ? '신청 중...' : '신청하기'}</button>
        </div>
      )}
    </div>
  );
}
