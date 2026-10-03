import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';

// 관리자 설정 → 이벤트 (2026-10-03). 앱 출시 이벤트 문구·활성·마감일 수정, 신청자 목록(인스타·이름·연락처) 확인·CSV 저장.
interface Cfg { active: boolean; title: string; description: string; prize: string; endsAt: string | null; buttonLabel: string; open: boolean; count?: number }
interface Entry { id: string; name: string | null; instagram: string | null; phone: string | null; message: string | null; createdAt: string; user: { id: string; name: string; nickname: string | null; email: string; phone: string | null; provider: string | null } }
const KEY = 'launch';

export default function AdminEventPanel() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; prize: string; endsAt: string; buttonLabel: string }>({ title: '', description: '', prize: '', endsAt: '', buttonLabel: '' });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => {
    api<Cfg>(`/events/${KEY}`).then((c) => { setCfg(c); setForm({ title: c.title, description: c.description, prize: c.prize || '', endsAt: c.endsAt ? c.endsAt.slice(0, 10) : '', buttonLabel: c.buttonLabel }); }).catch(() => toastError('이벤트 설정을 불러오지 못했어요.'));
    api<Entry[]>(`/events/admin/${KEY}/entries`).then(setEntries).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<Cfg> & { endsAt?: string | null }) => {
    setBusy(true);
    try { await api(`/events/admin/${KEY}`, { method: 'PUT', body: patch }); toastSuccess('저장했어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
    finally { setBusy(false); }
  };
  const remove = async (en: Entry) => {
    if (!window.confirm(`${en.name || en.user.name} 님 신청을 지울까요?`)) return;
    try { await api(`/events/admin/${KEY}/entries/${en.id}`, { method: 'DELETE' }); load(); } catch { toastError('지우지 못했어요.'); }
  };
  const downloadCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['신청일시', '이름', '닉네임', '인스타그램', '전화', '이메일', '가입방식', '응원 한마디'].map(esc).join(',')];
    for (const e of entries) lines.push([new Date(e.createdAt).toLocaleString('ko-KR'), e.name || e.user.name, e.user.nickname || '', e.instagram ? '@' + e.instagram : '', e.phone || e.user.phone || '', e.user.email, e.user.provider || 'email', e.message || ''].map(esc).join(','));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `이벤트_신청자_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">앱 출시 이벤트</h3>
          <p className="text-[11px] text-gray-500 mt-1">켜져 있으면 홈 배너 첫 장에 이벤트 카드가 10초 고정으로 뜨고, 신청 페이지(/event/launch)에서 로그인 회원이 성함·연락처·인스타그램·응원 한마디를 적고 신청합니다. 한 사람당 1건(같은 연락처·인스타 중복 불가). 당첨 안내는 앱 채팅으로.</p>
        </div>
        {cfg && (
          <button onClick={() => save({ active: !cfg.active })} disabled={busy} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border ${cfg.active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300'}`}>
            {cfg.active ? '진행중 (누르면 종료)' : '종료됨 (누르면 시작)'}
          </button>
        )}
      </div>
      {cfg && (
        <div className="grid gap-2">
          <input className={input} placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={input} rows={3} placeholder="설명 (배너와 신청 페이지에 보임)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className={input} rows={6} placeholder={"경품 (비우면 숨김). 한 줄에 하나:\n이름|부제|인원  → 검정 카드 (예: 시즌 풀케어|본인 한정|1명)\n카드 앞 줄은 안내(예: Snow Meta 제공 · 총 9분께 드려요), 카드 뒤 줄은 주의 문구"} value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-gray-500">마감일 (비우면 무기한)<input type="date" className={input + ' mt-1'} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            <label className="text-[11px] text-gray-500">버튼 문구<input className={input + ' mt-1'} value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} /></label>
          </div>
          <button onClick={() => save({ title: form.title, description: form.description, prize: form.prize, buttonLabel: form.buttonLabel, endsAt: form.endsAt ? new Date(form.endsAt + 'T23:59:59+09:00').toISOString() : null })} disabled={busy} className="py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40">문구 저장</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">신청자 {entries.length}명</p>
        {entries.length > 0 && <button onClick={downloadCsv} className="text-xs font-bold text-gray-900 underline">CSV 저장</button>}
      </div>
      {entries.length === 0 ? <p className="text-xs text-gray-500">아직 신청자가 없어요.</p> : (
        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className="py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{e.name || e.user.name}{e.user.nickname ? ` (${e.user.nickname})` : ''} {e.instagram ? <span className="font-normal text-gray-700">@{e.instagram}</span> : <span className="font-normal text-gray-400">인스타 없음</span>}</p>
                <p className="text-[11px] text-gray-500 truncate">{e.phone || e.user.phone || '전화 없음'} · {e.user.email} · {new Date(e.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                {e.message && <p className="text-[11px] text-gray-700 mt-0.5 line-clamp-2">{e.message}</p>}
              </div>
              <button onClick={() => remove(e)} className="text-[11px] text-gray-500 flex-shrink-0">삭제</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
