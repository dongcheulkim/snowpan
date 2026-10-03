import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser, isNativeApp } from '../api';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/appLinks';
import { loginPath } from '../utils/loginPath';
import { toastError, toastSuccess } from '../utils/toast';
import { useMeta } from '../hooks/useMeta';

// 앱 출시 기념 이벤트 신청 (2026-10-03). 홈 배너에서 진입. 로그인한 회원만 신청, 인스타그램 아이디는 선택.
interface EventInfo { key: string; appOnly?: boolean; open: boolean; title: string; description: string; prize: string; endsAt: string | null; buttonLabel: string; count: number }
interface Mine { applied: boolean; name?: string; phone?: string | null; instagram?: string | null; message?: string | null; createdAt?: string }

export default function EventLaunch() {
  const navigate = useNavigate();
  const user = getUser();
  const userId = user?.id; // getUser() 는 매 렌더 새 객체 — effect 의존성은 id 로 (객체로 두면 무한 재요청)
  const [ev, setEv] = useState<EventInfo | null | undefined>(undefined);
  const [mine, setMine] = useState<Mine | null>(null);
  const [instagram, setInstagram] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(''); // 응원 한마디 (선택)
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  useMeta({ title: ev?.title || '이벤트', description: ev?.description || '스노우판 이벤트 신청' });

  useEffect(() => {
    api<EventInfo>('/events/launch').then(setEv).catch(() => setEv(null));
    if (userId) api<Mine>('/events/launch/me').then((m) => { setMine(m); setName(m.name || ''); setPhone(m.phone || ''); if (m.instagram) setInstagram(m.instagram); if (m.message) setMessage(m.message); }).catch(() => {});
  }, [userId]);

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) { toastError('성함을 적어 주세요.'); return; }
    if (!/^01[016789]\d{7,8}$/.test(phone.replace(/\D/g, ''))) { toastError('연락처를 숫자로 적어 주세요. (예: 01012345678)'); return; }
    if (!instagram.trim()) { toastError('인스타그램 아이디를 적어 주세요.'); return; }
    setBusy(true);
    try {
      const r = await api<Mine & { updated: boolean }>('/events/launch/apply', { method: 'POST', body: { name, phone, instagram, message } });
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
        {ev.prize && (() => {
          // 경품 텍스트 형식(관리자 입력): "이름|부제|N명" 줄은 검정 카드, 첫 카드 앞 줄은 안내 문구, 카드 뒤 줄은 주의 문구
          const lines = ev.prize.split('\n').map((l) => l.trim()).filter(Boolean);
          const cards = lines.filter((l) => l.includes('|')).map((l) => { const [name, sub, n] = l.split('|').map((x) => x.trim()); return { name, sub, n }; });
          const firstCard = lines.findIndex((l) => l.includes('|'));
          const head = firstCard < 0 ? lines : lines.slice(0, firstCard).filter((l) => !l.includes('|'));
          const foot = firstCard < 0 ? [] : lines.slice(firstCard).filter((l) => !l.includes('|'));
          return (
            <section>
              <h2 className="text-lg font-bold text-gray-900">경품 안내</h2>
              {head.map((l, i) => <p key={i} className="text-xs text-gray-500 mt-1">{l}</p>)}
              {cards.length > 0 && (
                <div className="mt-3 space-y-2">
                  {cards.map((c, i) => (
                    <div key={i} className="rounded-2xl bg-[#111111] text-white px-5 py-5 flex items-center justify-between" style={{ marginLeft: `${Math.max(0, (cards.length - 1 - i) * 10)}px` }}>
                      <div>
                        <p className="text-base font-bold">{c.name}</p>
                        {c.sub && <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>}
                      </div>
                      {c.n && <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white text-gray-900 text-xs font-bold">{c.n}</span>}
                    </div>
                  ))}
                </div>
              )}
              {foot.length > 0 && <div className="mt-3 space-y-0.5">{foot.map((l, i) => <p key={i} className="text-[11px] text-gray-400 leading-relaxed">{l}</p>)}</div>}
            </section>
          );
        })()}

        {!ev.open ? (
          <section className="border border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-gray-900">이벤트 신청이 마감됐어요.</p>
            <p className="text-xs text-gray-500 mt-1">참여해 주신 분들께 감사드려요.</p>
          </section>
        ) : ev.appOnly !== false && !isNativeApp() ? (
          <section className="border border-gray-900 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">스노우판 앱에서 신청할 수 있어요</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">앱을 받고 로그인한 뒤, 홈 첫 화면의 이벤트 배너에서 신청해 주세요.{mine?.applied ? ' 이미 신청하신 내역은 그대로 접수돼 있어요.' : ''}</p>
            <div className="grid gap-2 mt-4">
              {APP_STORE_URL && <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold text-center">App Store 에서 받기</a>}
              {PLAY_STORE_URL && <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-xl border border-gray-900 text-gray-900 text-sm font-bold text-center">Google Play 에서 받기</a>}
            </div>
          </section>
        ) : !user ? (
          <section className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">로그인하면 바로 신청할 수 있어요.</p>
            <p className="text-xs text-gray-500 mt-1">카카오·애플 로그인 10초면 끝. 로그인 뒤 이 화면으로 돌아와요. 당첨 안내는 스노우판 앱 채팅으로 드려요.</p>
            <button onClick={() => navigate(loginPath('/event/launch'))} className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold">로그인하고 신청하기</button>
          </section>
        ) : applied && !editing ? (
          <section className="border border-gray-900 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">신청 완료</p>
            <p className="text-xs text-gray-500 mt-1">{mine?.createdAt ? new Date(mine.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : ''} · 한 사람당 한 번만 신청돼요</p>
            <dl className="mt-3 text-sm text-gray-900 space-y-1">
              <div className="flex gap-3"><dt className="w-20 text-gray-500">성함</dt><dd className="font-bold">{mine?.name}</dd></div>
              <div className="flex gap-3"><dt className="w-20 text-gray-500">연락처</dt><dd className="font-bold">{(mine?.phone || '').replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')}</dd></div>
              <div className="flex gap-3"><dt className="w-20 text-gray-500">인스타그램</dt><dd className="font-bold">@{mine?.instagram}</dd></div>
              {mine?.message && <div className="flex gap-3"><dt className="w-20 text-gray-500">응원 한마디</dt><dd>{mine.message}</dd></div>}
            </dl>
            <p className="text-xs text-gray-500 mt-3">당첨 안내는 스노우판 앱 채팅으로 드려요.</p>
            <button onClick={() => setEditing(true)} className="mt-4 w-full py-2.5 rounded-xl border border-gray-900 text-gray-900 text-sm font-bold">신청 정보 수정</button>
          </section>
        ) : (
          <section className="border border-gray-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-gray-900">{applied ? '신청 정보 수정' : '이벤트 신청'}</p>
            <p className="text-xs text-gray-500 mt-1">한 사람당 한 번만 신청할 수 있어요. 당첨 안내는 스노우판 앱 채팅으로 드려요.</p>
            <label className="block mt-4">
              <span className="text-[11px] font-bold text-gray-500">성함</span>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder="홍길동" maxLength={30}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900" />
            </label>
            <label className="block mt-3">
              <span className="text-[11px] font-bold text-gray-500">연락처</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9-]/g, ''))} placeholder="01012345678" type="tel" inputMode="numeric" maxLength={13}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900" />
            </label>
            <label className="block mt-3">
              <span className="text-[11px] font-bold text-gray-500">인스타그램 아이디</span>
              <div className="mt-1 flex items-center border border-gray-200 rounded-xl px-3 focus-within:border-gray-900">
                <span className="text-sm text-gray-400">@</span>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))} placeholder="snowpan_official"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={40} className="flex-1 py-2.5 pl-1 text-sm outline-none bg-transparent" />
              </div>
            </label>
            <label className="block mt-3">
              <span className="text-[11px] font-bold text-gray-500">스노우판에 응원 한마디 (선택)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 200))} placeholder="이번 시즌 스노우판에 바라는 점, 응원 한마디" rows={3} maxLength={200}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 resize-none" />
              <span className="block text-right text-[11px] text-gray-400">{message.length}/200</span>
            </label>
            <button onClick={submit} disabled={busy} className="mt-2 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40">
              {busy ? '처리중' : applied ? '저장' : ev.buttonLabel}
            </button>
            {applied && <button onClick={() => setEditing(false)} className="mt-2 w-full py-2 text-xs text-gray-500">취소</button>}
          </section>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          적어 주신 성함·연락처·인스타그램 아이디는 당첨자 선정과 안내에만 쓰고, 이벤트가 끝나면 지웁니다. 당첨 안내는 스노우판 앱 채팅으로 드려요.
        </p>
      </div>
    </div>
  );
}
