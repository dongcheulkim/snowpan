import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { loginPath } from '../utils/loginPath';
import { toastError, toastSuccess } from '../utils/toast';
import { useMeta } from '../hooks/useMeta';

// 앱 출시 기념 이벤트 신청 (2026-10-03). 홈 배너에서 진입. 로그인한 회원만 신청, 인스타그램 아이디는 선택.
interface EventInfo { key: string; open: boolean; title: string; description: string; prize: string; endsAt: string | null; buttonLabel: string; count: number }
interface Mine { applied: boolean; instagram?: string | null; createdAt?: string }

export default function EventLaunch() {
  const navigate = useNavigate();
  const user = getUser();
  const userId = user?.id; // getUser() 는 매 렌더 새 객체 — effect 의존성은 id 로 (객체로 두면 무한 재요청)
  const [ev, setEv] = useState<EventInfo | null | undefined>(undefined);
  const [mine, setMine] = useState<Mine | null>(null);
  const [instagram, setInstagram] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  useMeta({ title: ev?.title || '이벤트', description: ev?.description || '스노우판 이벤트 신청' });

  useEffect(() => {
    api<EventInfo>('/events/launch').then(setEv).catch(() => setEv(null));
    if (userId) api<Mine>('/events/launch/me').then((m) => { setMine(m); if (m.applied && m.instagram) setInstagram(m.instagram); }).catch(() => {});
  }, [userId]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<Mine & { updated: boolean }>('/events/launch/apply', { method: 'POST', body: { instagram } });
      setMine(r); setEditing(false);
      toastSuccess(r.updated ? '인스타그램 아이디를 바꿨어요.' : '이벤트 신청이 완료됐어요.');
    } catch (e) { toastError(e instanceof Error ? e.message : '신청하지 못했어요.'); }
    finally { setBusy(false); }
  };

  if (ev === undefined) return <div className="min-h-screen bg-white" />;
  if (ev === null) return (
    <div className="min-h-screen bg-white px-5 py-10 text-center">
      <p className="text-sm text-gray-600">이벤트를 찾을 수 없어요.</p>
      <Link to="/" className="inline-block mt-4 text-sm font-bold text-gray-900 underline">홈으로</Link>
    </div>
  );

  const endsText = ev.endsAt ? new Date(ev.endsAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + '까지' : null;
  const applied = !!mine?.applied;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#111111] text-white px-6 pt-10 pb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-2">EVENT</p>
        <h1 className="text-2xl font-bold leading-snug">{ev.title}</h1>
        <p className="text-sm text-gray-300 mt-3 leading-relaxed whitespace-pre-line">{ev.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[11px] text-gray-400">
          {endsText && <span>{endsText}</span>}
          <span>{ev.count.toLocaleString()}명 신청</span>
          <span>로그인 회원만 참여</span>
        </div>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto space-y-5">
        {ev.prize && (
          <section className="border border-gray-200 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-500 mb-1">경품</p>
            <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed">{ev.prize}</p>
          </section>
        )}

        {!ev.open ? (
          <section className="border border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-gray-900">이벤트 신청이 마감됐어요.</p>
            <p className="text-xs text-gray-500 mt-1">참여해 주신 분들께 감사드려요.</p>
          </section>
        ) : !user ? (
          <section className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">로그인하면 바로 신청할 수 있어요.</p>
            <p className="text-xs text-gray-500 mt-1">카카오·애플 로그인 10초면 끝. 로그인 뒤 이 화면으로 돌아와요.</p>
            <button onClick={() => navigate(loginPath('/event/launch'))} className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold">로그인하고 신청하기</button>
          </section>
        ) : applied && !editing ? (
          <section className="border border-gray-900 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">신청 완료</p>
            <p className="text-xs text-gray-500 mt-1">{mine?.createdAt ? new Date(mine.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</p>
            <div className="mt-3 text-sm text-gray-900">
              인스타그램: {mine?.instagram ? <span className="font-bold">@{mine.instagram}</span> : <span className="text-gray-500">남기지 않음</span>}
            </div>
            <button onClick={() => setEditing(true)} className="mt-4 w-full py-2.5 rounded-xl border border-gray-900 text-gray-900 text-sm font-bold">인스타그램 아이디 {mine?.instagram ? '바꾸기' : '남기기'}</button>
          </section>
        ) : (
          <section className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">{applied ? '인스타그램 아이디 바꾸기' : '이벤트 신청'}</p>
            <p className="text-xs text-gray-500 mt-1">{user.nickname || user.name} 님으로 신청해요. 인스타그램 아이디를 남기면 당첨 소식을 DM 으로도 알려드려요.</p>
            <label className="block mt-4">
              <span className="text-[11px] font-bold text-gray-500">인스타그램 아이디 (선택)</span>
              <div className="mt-1 flex items-center border border-gray-200 rounded-xl px-3 focus-within:border-gray-900">
                <span className="text-sm text-gray-400">@</span>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                  placeholder="snowpan_official"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={40}
                  className="flex-1 py-2.5 pl-1 text-sm outline-none bg-transparent"
                />
              </div>
            </label>
            <button onClick={submit} disabled={busy} className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40">
              {busy ? '처리중' : applied ? '저장' : ev.buttonLabel}
            </button>
            {applied && <button onClick={() => setEditing(false)} className="mt-2 w-full py-2 text-xs text-gray-500">취소</button>}
          </section>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          신청 시 회원 정보(이름·연락처)와 남긴 인스타그램 아이디는 당첨자 선정과 안내에만 쓰고, 이벤트가 끝나면 지웁니다. 당첨 안내는 앱 알림과 인스타그램 DM 으로 드려요.
        </p>
      </div>
    </div>
  );
}
