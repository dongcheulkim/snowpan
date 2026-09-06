// 사장님 입점 1단계 — "내 매장 먼저 찾기". 스노우판이 공개 영업정보로 미리 올려 둔 매장(사장님 확인 전)이 있으면
// 새로 등록하지 말고 그 자리에서 "직접 관리하기"(사업자등록증)로 가져가게 하고, 없을 때만 업종별 신규 등록으로 보낸다.
// 로그인 필수(/partners 의 "매장 등록하기" → 로그인 → 여기). 검색은 GET /shop-claims/find?q= (상호 또는 전화번호).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getUser } from '../api';
import ClaimShopButton from '../components/ClaimShopButton';
import { useMeta } from '../hooks/useMeta';

type Kind = 'skishop' | 'repair' | 'rental' | 'accommodation';
interface Hit { kind: Kind; id: string; name: string; address: string | null; phone: string | null; resort: string | null; claimable: boolean; mine: boolean; ownerManaged: boolean }

const KIND_LABEL: Record<Kind, string> = { skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', accommodation: '숙소' };
const KIND_PATH: Record<Kind, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', accommodation: '/accommodation' };
const REGISTER = [
  { label: '스키·보드샵', to: '/skishop/register' },
  { label: '정비샵', to: '/repair/register' },
  { label: '렌탈샵', to: '/rental/register' },
  { label: '레슨', to: '/lesson/register' },
  { label: '숙소', to: '/accommodation/register' },
];

export default function PartnerFind() {
  useMeta({ title: '내 매장 먼저 찾기 | 스노우판', description: '스노우판에 이미 올라온 내 매장이 있는지 상호나 전화번호로 확인하고 직접 관리하기로 가져가세요.' });
  const me = getUser();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (term: string) => {
    const t = term.trim();
    if (t.length < 2) { setError('상호 또는 전화번호를 2자 이상 입력하세요.'); return; }
    setError(''); setBusy(true);
    try {
      const rows = await api<Hit[]>(`/shop-claims/find?q=${encodeURIComponent(t)}`);
      setHits(rows);
      setParams({ q: t }, { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : '검색에 실패했습니다.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { const t = params.get('q'); if (t && t.trim().length >= 2) search(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/partners" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 매장 먼저 찾기</h1>
      </div>
      <p className="text-xs text-gray-500 -mt-2 leading-relaxed">
        스노우판은 리조트 주변 매장을 공개 영업정보로 먼저 올려 두었습니다. 내 매장이 이미 있으면 새로 등록하지 말고 그 매장을 가져가세요.
        사업자등록증 한 장이면 승인 후 대시보드에서 바로 관리할 수 있습니다.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); search(q); }} className="card p-4 space-y-2">
        <label className="text-xs font-bold text-gray-900" htmlFor="find-q">상호 또는 전화번호</label>
        <div className="flex gap-2">
          <input
            id="find-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="예: 메가폰, 0507-1234-5678"
            autoFocus
            className="flex-1 min-w-0 px-3 py-2.5 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button type="submit" disabled={busy} className="px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40">{busy ? '검색 중' : '찾기'}</button>
        </div>
        {error && <p className="text-xs text-coral">{error}</p>}
        <p className="text-[11px] text-gray-400">네이버에 올라온 상호와 조금 다를 수 있으니 짧게(두세 글자) 검색해 보세요.</p>
      </form>

      {hits && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-900">{hits.length ? `${hits.length}곳을 찾았습니다` : '같은 이름의 매장이 없습니다'}</p>
          {hits.map((h) => (
            <div key={`${h.kind}:${h.id}`} className="card p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{KIND_LABEL[h.kind]}</span>
                <span className="text-sm font-bold text-gray-900">{h.name}</span>
                {h.claimable && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">사장님 확인 전</span>}
                {h.mine && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">내 매장</span>}
              </div>
              <p className="text-[11px] text-gray-500">
                {h.resort ? `${h.resort} 인근` : ''}{h.resort && h.address ? ' · ' : ''}{h.address || ''}{h.phone ? ` · ${h.phone}` : ''}
              </p>
              {h.mine ? (
                <Link to="/mypage/shops" className="block w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">사장님 대시보드에서 관리하기 →</Link>
              ) : h.claimable ? (
                <ClaimShopButton shopType={h.kind} shopId={h.id} claimable={h.claimable} />
              ) : (
                <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  이미 다른 계정이 관리 중인 매장입니다. 내 매장이 맞다면 <Link to="/mypage/support" className="underline text-gray-700">고객센터 채팅</Link>으로 알려주세요.
                </p>
              )}
              <Link to={`${KIND_PATH[h.kind]}/${h.id}`} className="block text-[11px] text-gray-400 underline underline-offset-2">매장 페이지 보기</Link>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900">{hits && hits.length === 0 ? '없으면 새로 등록하세요' : '내 매장이 없으면 새로 등록'}</h2>
        <p className="text-xs text-gray-500 mt-1">업종을 고르면 등록 화면으로 갑니다. 사업자등록증을 준비해 주세요.</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {REGISTER.map((r) => (
            <Link key={r.to} to={r.to} className="py-2 rounded-lg bg-snow border border-gray-200 text-xs font-bold text-gray-700 text-center hover:bg-gray-100 transition-colors">{r.label}</Link>
          ))}
        </div>
        {me && <Link to="/mypage/shops" className="block text-center text-xs text-gray-500 underline underline-offset-2 mt-3">이미 등록한 매장 보기 (사장님 대시보드)</Link>}
      </div>
    </div>
  );
}
