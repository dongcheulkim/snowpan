import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from './Toast';

// 관리자 설정 — 인스타그램 @snowpan.kr 연동. 토큰을 한 번 넣으면 서버가 1시간마다 최신 게시물을 받아
// 홈 "인스타그램" 섹션에 띄우고, 60일마다 만료되는 토큰도 알아서 연장한다.
// 토큰 값은 저장 후 어떤 화면·응답에도 다시 나오지 않는다(연결 여부와 계정명만 표시).
interface Status { connected: boolean; username: string | null; expiresAt: string | null; fetchedAt: string | null; count: number }

const fmt = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function InstagramPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [token, setToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => { api<Status>('/admin/instagram').then(setStatus).catch(() => setStatus(null)); };
  useEffect(load, []);

  const save = async () => {
    if (!token.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api<{ username: string | null; posts: number }>('/admin/instagram/token', {
        method: 'PUT',
        body: { token: token.trim(), appSecret: appSecret.trim() || undefined },
      });
      toastSuccess(`인스타 연결 완료 — @${r.username || ''} 게시물 ${r.posts}개를 받았어요.`);
      setToken(''); setAppSecret(''); load();
    } catch (e) { toastError(e instanceof Error ? e.message : '연결에 실패했습니다.'); }
    finally { setBusy(false); }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const r = await api<{ count: number }>('/admin/instagram/refresh', { method: 'POST' });
      toastSuccess(`최신 게시물 ${r.count}개를 다시 받았어요.`);
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '새로고침에 실패했습니다.'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm('인스타 연결을 끊을까요? 홈의 인스타그램 섹션이 사라져요.')) return;
    setBusy(true);
    try { await api('/admin/instagram', { method: 'DELETE' }); toastSuccess('연결을 끊었어요.'); load(); }
    catch { toastError('해제에 실패했습니다.'); }
    finally { setBusy(false); }
  };

  const input = 'w-full px-3 py-2 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none';

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">인스타그램 연동</h3>
        {status && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.connected ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {status.connected ? `연결됨 @${status.username || ''}` : '연결 안 됨'}
          </span>
        )}
      </div>

      {status?.connected ? (
        <>
          <div className="text-xs text-gray-600 space-y-1">
            <p>마지막 수집: {fmt(status.fetchedAt)} · 게시물 {status.count}개</p>
            <p>토큰 만료 예정: {fmt(status.expiresAt)} (만료 10일 전 자동 연장)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} disabled={busy} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs disabled:opacity-40">지금 다시 받기</button>
            <button onClick={disconnect} disabled={busy} className="flex-1 py-2.5 bg-gray-100 text-red-500 rounded-lg font-bold text-xs border border-gray-200 disabled:opacity-40">연결 끊기</button>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed">
          메타 개발자 사이트에서 받은 인스타그램 액세스 토큰을 넣으면 홈에 최신 게시물이 자동으로 올라와요. 앱 시크릿까지 넣으면 짧은 토큰도 장기 토큰으로 바꿔서 저장해요.
        </p>
      )}

      <div className="space-y-2 pt-1">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="액세스 토큰" className={input} autoComplete="off" />
        <input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder="앱 시크릿 (선택 — 짧은 토큰일 때만)" className={input} autoComplete="off" />
        <button onClick={save} disabled={busy || !token.trim()} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs disabled:opacity-40">
          {busy ? '연결 중...' : status?.connected ? '토큰 교체' : '연결하기'}
        </button>
      </div>
    </div>
  );
}
