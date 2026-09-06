// 관리자 대시보드 "매장연락보드" 탭 — 스노우판이 먼저 올려 둔(사장님 확인 전) 매장 사장님께 전화·문자로
// "직접 관리하기"를 안내하는 작업판. 리조트별로 접어 두고, 그룹 안은 우선순위(수집 시점 리뷰 수)·조회수 순.
// 상태·메모는 /admin/outreach 에 저장돼 폰·PC 어디서 열어도 같다. 백엔드 outreachController 와 짝.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openExternal } from '../api';
import { toastError, toastSuccess } from './Toast';
import HScroll from './HScroll';
import { KIND_LABEL, KIND_PATH, type ShopKind } from '../utils/shopKinds';

type Status = 'none' | 'absent' | 'called' | 'yes' | 'no' | 'del';
interface Shop {
  id: string; kind: ShopKind; name: string; area: string; resortId: string; resort: string; address: string; phone: string; hours: string;
  naver: string; extraKinds: string; owner: boolean; viewCount: number; status: Status; memo: string; priority: number; updatedAt: string | null;
}
interface ResortLite { id: string; name: string; location?: string | null }
interface BoardData { shops: Shop[]; resorts: ResortLite[]; template: string | null }
interface Group { key: string; name: string; hint: string; ids: string[] }

// Tailwind 는 클래스명을 정적으로 찾으므로 색 클래스는 조합하지 않고 전부 적어 둔다
const STATUS: { v: Status; label: string; dot: string; sel: string; bar: string; edge: string }[] = [
  { v: 'none', label: '미연락', dot: 'bg-gray-400', sel: 'bg-gray-100 text-gray-600 border-gray-200', bar: 'bg-gray-300', edge: 'border-l-transparent' },
  { v: 'absent', label: '부재중', dot: 'bg-amber-500', sel: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400', edge: 'border-l-amber-400' },
  { v: 'called', label: '통화 완료', dot: 'bg-sky-500', sel: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-500', edge: 'border-l-sky-500' },
  { v: 'yes', label: '등록하기로 함', dot: 'bg-emerald-500', sel: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', edge: 'border-l-emerald-500' },
  { v: 'no', label: '거절', dot: 'bg-slate-500', sel: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400', edge: 'border-l-slate-400' },
  { v: 'del', label: '삭제 요청', dot: 'bg-red-500', sel: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500', edge: 'border-l-red-500' },
];
const STATUS_BY = Object.fromEntries(STATUS.map((s) => [s.v, s])) as Record<Status, (typeof STATUS)[number]>;
const KIND_CLS: Record<ShopKind, string> = { skishop: 'bg-violet-50 text-violet-700', repair: 'bg-amber-50 text-amber-700', rental: 'bg-emerald-50 text-emerald-700' };
const KIND_CHIP_ON: Record<string, string> = { all: 'bg-gray-900 text-white border-gray-900', skishop: 'bg-violet-100 text-violet-700 border-violet-300', repair: 'bg-amber-100 text-amber-700 border-amber-300', rental: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
// 전화 도는 순서 — 사용자 결정(곤지암→지산→비발디→휘닉스→용평·알펜시아→하이원→무주), 나머지는 뒤에
const PRIORITY = ['곤지암리조트', '지산리조트', '비발디파크', '휘닉스평창', '용평리조트', '알펜시아', '하이원', '무주덕유산', '웰리힐리파크', '오크밸리', '엘리시안강촌', '오투리조트', '에덴밸리'];
const MERGE: Record<string, string> = { '알펜시아': '용평리조트' }; // 붙어 있는 리조트는 한 묶음
const MERGED_NAME: Record<string, string> = { '용평리조트': '용평·알펜시아' };
const SITE = 'https://snowpan.kr';
const DEFAULT_SMS = `[스노우판] 안녕하세요, {상호} 사장님. 스키어들이 리조트 근처 매장을 찾는 앱 '스노우판'에 매장 기본 정보가 올라가 있습니다.
아래 매장 페이지에서 '직접 관리하기'를 누르고 사업자등록증만 올리시면 사진·소식을 무료로 직접 관리하실 수 있어요.
매장 페이지: {링크}
입점 안내: https://snowpan.kr/partners
지금은 베타 기간이라 앱 대신 위 인터넷 주소로 들어오시면 되고, 앱은 곧 출시 예정입니다.
궁금한 점은 고객센터 채팅으로 바로 물어보세요: https://snowpan.kr/mypage/support`;
const SCRIPT = `안녕하세요, 스키·보드 앱 '스노우판'입니다. 스키어들이 리조트별로 근처 렌탈샵·정비샵·스키샵을 찾는 앱인데요, 사장님 매장이 지금 [리조트] 목록에 기본 정보만 올라가 있어요.
사진이랑 매장 소식을 무료로 직접 올리실 수 있게 관리 링크를 문자로 보내드려도 될까요? 사업자등록증 한 장만 올리시면 되고 1~2분이면 끝납니다.
지금은 베타 기간이라 앱이 아니라 문자로 보내드리는 인터넷 주소로 들어오시면 되고, 앱도 곧 출시됩니다.`;
const OPEN_KEY = 'admin-outreach-open';

const shortAddr = (a: string) => a.replace(/^(강원특별자치도|전북특별자치도|경기도|서울특별시|충청북도|충청남도|경상남도|경상북도|전라남도|부산광역시|대구광역시|인천광역시|울산광역시|강원도)\s+/, '');
const shortHours = (h: string) => { const f = h.split(/,\s*/)[0] || ''; return f.length > 24 ? f.slice(0, 24) + '…' : f; };
const fmtWhen = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`; };
const shopUrl = (s: Shop) => `${SITE}${KIND_PATH[s.kind]}/${s.id}`;
const smsFor = (tpl: string, s: Shop) => tpl.replace(/\{상호\}/g, s.name).replace(/\{링크\}/g, shopUrl(s)).replace(/\{리조트\}/g, s.resort || '리조트');
const effStatus = (s: Shop): Status | 'owner' => (s.owner ? 'owner' : s.status);
const contacted = (s: Shop) => effStatus(s) !== 'none';

function buildGroups(resorts: ResortLite[]): Group[] {
  const order = (name: string) => { const i = PRIORITY.indexOf(name); return i === -1 ? PRIORITY.length : i; };
  const byHead = new Map<string, { ids: string[]; location: string }>();
  for (const r of [...resorts].sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name, 'ko'))) {
    const head = MERGE[r.name] || r.name;
    const g = byHead.get(head) || { ids: [], location: r.location || '' };
    g.ids.push(r.id); if (!g.location) g.location = r.location || '';
    byHead.set(head, g);
  }
  const groups: Group[] = [...byHead.entries()].map(([head, g]) => ({ key: head, name: MERGED_NAME[head] || head, hint: g.location.replace(/(특별자치도|특별시|광역시|도)\s/, ' ').trim(), ids: g.ids }));
  groups.push({ key: '__none', name: '리조트 외', hint: '서울·도심 매장', ids: [''] });
  return groups;
}

function ProgressBar({ shops, className = '' }: { shops: Shop[]; className?: string }) {
  const total = shops.length || 1;
  const counts: Record<string, number> = {};
  shops.forEach((s) => { const k = effStatus(s); counts[k] = (counts[k] || 0) + 1; });
  const order: (Status | 'owner')[] = ['yes', 'owner', 'called', 'absent', 'no', 'del'];
  return (
    <div className={`h-1.5 rounded-full bg-gray-100 overflow-hidden flex ${className}`}>
      {order.filter((k) => counts[k]).map((k) => (
        <span key={k} className={`h-full ${k === 'owner' ? STATUS_BY.yes.bar : STATUS_BY[k as Status].bar}`} style={{ width: `${(counts[k] / total) * 100}%` }} />
      ))}
    </div>
  );
}

// 메모 입력 — 포커스가 빠지거나 Enter 일 때만 저장 (타이핑마다 요청하지 않음)
function MemoInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value); }, [value]);
  const commit = () => { focused.current = false; const v = draft.trim(); if (v !== value) onSave(v); };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder="메모 (예: 9/8 다시 전화, 사진 받음)"
      className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
    />
  );
}

export default function OutreachBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | ShopKind>('all');
  const [status, setStatus] = useState<'all' | Status | 'owner'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'priority' | 'name' | 'recent'>('priority');
  const [open, setOpen] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}'); } catch { return {}; } });
  const [tplDraft, setTplDraft] = useState('');
  const [modalText, setModalText] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<BoardData>('/admin/outreach');
      setData(d); setTplDraft(d.template || DEFAULT_SMS);
    } catch (e) { toastError(e instanceof Error ? e.message : '연락 보드를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => buildGroups(data?.resorts || []), [data?.resorts]);
  const shops = data?.shops || [];
  const template = data?.template || DEFAULT_SMS;

  const patchShop = (id: string, kindOf: ShopKind, patch: Partial<Shop>) =>
    setData((d) => d ? { ...d, shops: d.shops.map((s) => (s.id === id && s.kind === kindOf ? { ...s, ...patch } : s)) } : d);

  const save = async (s: Shop, patch: { status?: Status; memo?: string }) => {
    const before = { status: s.status, memo: s.memo, updatedAt: s.updatedAt };
    patchShop(s.id, s.kind, { ...patch, updatedAt: new Date().toISOString() });
    try { await api(`/admin/outreach/${s.kind}/${s.id}`, { method: 'PUT', body: patch }); }
    catch (e) { patchShop(s.id, s.kind, before); toastError(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
  };
  const saveTemplate = async () => {
    const sms = tplDraft.trim();
    if (!sms || sms === template) return;
    try { await api('/admin/outreach/template', { method: 'PUT', body: { sms } }); setData((d) => d ? { ...d, template: sms } : d); toastSuccess('문자 템플릿을 저장했습니다.'); }
    catch (e) { toastError(e instanceof Error ? e.message : '템플릿을 저장하지 못했습니다.'); }
  };
  const copySms = async (s: Shop) => {
    const text = smsFor(template, s);
    try { await navigator.clipboard.writeText(text); toastSuccess('문자 내용을 복사했습니다.'); }
    catch { setModalText(text); }
  };
  const toggle = (key: string, force?: boolean) => setOpen((o) => { const n = { ...o, [key]: force ?? !o[key] }; try { localStorage.setItem(OPEN_KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });

  // 필터·정렬
  const filtering = kind !== 'all' || status !== 'all' || q.trim() !== '';
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/-/g, '');
    return shops.filter((s) => {
      if (kind !== 'all' && s.kind !== kind) return false;
      if (status !== 'all' && effStatus(s) !== status) return false;
      if (needle && !`${s.name} ${s.address} ${s.phone.replace(/-/g, '')} ${s.resort}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [shops, kind, status, q]);
  const sortRows = (rows: Shop[]) => rows.slice().sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
    if (sort === 'recent') return (b.updatedAt || '').localeCompare(a.updatedAt || '') || b.priority - a.priority;
    return b.priority - a.priority || b.viewCount - a.viewCount || a.name.localeCompare(b.name, 'ko');
  });

  const scope = shops.filter((s) => kind === 'all' || s.kind === kind);
  const counts: Record<string, number> = { all: scope.length, owner: 0 }; STATUS.forEach((s) => { counts[s.v] = 0; });
  scope.forEach((s) => { counts[effStatus(s)]++; });
  const done = scope.length - (counts.none || 0);

  if (loading && !data) return <div className="text-center py-16 text-gray-500 text-sm">로딩 중...</div>;
  if (!data) return <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">연락 보드를 불러오지 못했습니다. <button onClick={load} className="underline">다시 시도</button></div>;

  return (
    <div className="space-y-3">
      {/* 요약 + 필터 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900">매장 연락 보드</p>
            <p className="text-[11px] text-gray-500">리조트별로 접어 두고, 그룹 안은 리뷰 많은 순. 상태와 메모는 자동 저장됩니다.</p>
          </div>
          <button onClick={load} className="text-xs font-bold text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors flex-shrink-0">새로고침</button>
        </div>
        <div>
          <ProgressBar shops={scope} className="h-2" />
          <div className="flex justify-between text-[11px] text-gray-500 mt-1 tabular-nums">
            <span>처리한 매장 <b className="text-gray-900">{done}</b> / {scope.length}</span>
            <span>{counts.none ? `미연락 ${counts.none}곳` : '전부 연락했습니다'}</span>
          </div>
        </div>
        <HScroll className="flex gap-1.5 overflow-x-auto pb-1">
          {([{ v: 'all', label: '전체', dot: '' }, ...STATUS, { v: 'owner', label: '사장님 등록', dot: 'bg-emerald-500' }] as { v: string; label: string; dot: string }[])
            .filter((s) => s.v === 'all' || s.v === 'none' || counts[s.v] > 0 || status === s.v)
            .map((s) => (
              <button
                key={s.v}
                onClick={() => setStatus(status === s.v ? 'all' : (s.v as Status | 'owner'))}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors tabular-nums ${status === s.v ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-600 border-gray-200'}`}
              >
                {s.dot && <i className={`w-2 h-2 rounded-full ${s.dot}`} />}{s.label} <b>{counts[s.v]}</b>
              </button>
            ))}
        </HScroll>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(['all', 'skishop', 'repair', 'rental'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${kind === k ? KIND_CHIP_ON[k] : 'bg-white text-gray-500 border-gray-200'}`}>
              {k === 'all' ? '전체' : k === 'skishop' ? '스키·보드샵' : k === 'repair' ? '정비샵' : '렌탈샵'}
            </button>
          ))}
          <div className="flex-1 min-w-[160px] flex gap-1.5">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="상호·주소·전화 검색" className="flex-1 min-w-0 px-2.5 py-1.5 bg-snow border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none" />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="정렬" className="px-2 py-1.5 bg-snow border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:outline-none">
              <option value="priority">리뷰 많은 순</option>
              <option value="name">가나다순</option>
              <option value="recent">최근 변경순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 통화 스크립트 · 문자 템플릿 */}
      <details className="card">
        <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-gray-900 list-none flex items-center justify-between">
          통화 스크립트 · 문자 템플릿 <span className="text-[11px] font-medium text-gray-400">펼치기 / 접기</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1">30초 통화 (전화 받았을 때)</p>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-snow border border-gray-100 rounded-lg p-3">{SCRIPT}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 mb-1">문자 템플릿 (매장별 "문자 복사"를 누르면 상호·링크가 자동으로 들어갑니다)</p>
            <textarea value={tplDraft} onChange={(e) => setTplDraft(e.target.value)} onBlur={saveTemplate} rows={6} spellCheck={false} className="w-full px-3 py-2 bg-snow border border-gray-200 rounded-lg text-xs text-gray-900 leading-relaxed focus:outline-none focus:border-gray-400 resize-y" />
            <p className="text-[11px] text-gray-400 mt-1">자리표시자: {'{상호} {링크} {리조트}'}. 칸을 벗어나면 저장됩니다.</p>
          </div>
          <ul className="text-xs text-gray-700 leading-relaxed list-disc pl-4 space-y-0.5">
            <li>리조트 한 곳씩 끝내기. 곤지암 → 지산 → 비발디 → 휘닉스 → 용평·알펜시아 → 하이원 → 무주 순으로, 리뷰 많은 매장부터.</li>
            <li>부재중이면 바로 문자만 보내고 "부재중"으로 표시. 이틀 뒤 한 번만 다시 걸기.</li>
            <li>내려 달라는 매장, 문 닫은 매장은 "삭제 요청". 모아서 한 번에 처리합니다. 상호·전화가 다르면 메모에 적어 두기.</li>
          </ul>
        </div>
      </details>

      {/* 리조트별 그룹 */}
      {(() => {
        const sections = groups.map((g) => ({ g, rows: sortRows(visible.filter((s) => g.ids.includes(s.resortId))) })).filter(({ rows }) => rows.length > 0 || !filtering);
        if (!sections.length) return <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500 text-sm">조건에 맞는 매장이 없습니다.</div>;
        return sections.map(({ g, rows }) => {
          const isOpen = filtering ? true : !!open[g.key];
          const doneN = rows.filter(contacted).length;
          return (
            <section key={g.key} className="card overflow-hidden">
              <button onClick={() => toggle(g.key)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="flex-1 text-sm font-bold text-gray-900">{g.name} <span className="text-[11px] font-medium text-gray-400 ml-1">{g.hint}</span></span>
                <ProgressBar shops={rows} className="w-16" />
                <span className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap"><b className="text-gray-900">{doneN}</b>/{rows.length}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100">
                  {rows.length === 0 && <div className="px-4 py-6 text-center text-xs text-gray-400">해당하는 매장이 없습니다</div>}
                  {rows.map((s, i) => {
                    const st = effStatus(s);
                    const extra = s.extraKinds.split(',').map((x) => x.trim()).filter((x): x is ShopKind => x in KIND_LABEL && x !== s.kind);
                    const border = st === 'owner' ? 'border-l-emerald-500' : STATUS_BY[st].edge;
                    return (
                      <div key={`${s.kind}:${s.id}`} className={`px-4 py-3 border-b border-gray-100 last:border-b-0 border-l-[3px] ${border} space-y-2`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-gray-400 tabular-nums w-5">{i + 1}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${KIND_CLS[s.kind]}`}>{KIND_LABEL[s.kind]}</span>
                          <span className={`text-sm font-bold ${st === 'del' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{s.name}</span>
                          {extra.map((k) => <span key={k} className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-500">+{KIND_LABEL[k]}</span>)}
                          <span className={`text-[11px] tabular-nums ${s.priority >= 100 ? 'text-amber-700 font-bold' : 'text-gray-400'}`}>리뷰 {s.priority}</span>
                          {s.owner && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">사장님 등록 완료</span>}
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug pl-7">
                          {s.address && <span>{shortAddr(s.address)}</span>}
                          {s.hours && <span> · {shortHours(s.hours)}</span>}
                          {!s.resort && s.area && <span> · {s.area}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pl-7">
                          {s.phone ? (
                            <a href={`tel:${s.phone.replace(/[^0-9+]/g, '')}`} className="px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold tabular-nums">전화 {s.phone}</a>
                          ) : (
                            <span className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-bold">전화번호 없음</span>
                          )}
                          {s.naver && <button onClick={() => openExternal(s.naver)} className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold">네이버</button>}
                          <Link to={`${KIND_PATH[s.kind]}/${s.id}`} className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold">스노우판</Link>
                          {!s.owner && <button onClick={() => copySms(s)} className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold">문자 복사</button>}
                        </div>
                        {!s.owner && (
                          <div className="flex flex-wrap gap-1.5 items-center pl-7">
                            <select
                              value={s.status}
                              onChange={(e) => save(s, { status: e.target.value as Status })}
                              aria-label="상태"
                              className={`px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none ${STATUS_BY[s.status].sel}`}
                            >
                              {STATUS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                            </select>
                            <MemoInput value={s.memo} onSave={(memo) => save(s, { memo })} />
                            <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{fmtWhen(s.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        });
      })()}

      {/* 클립보드가 막힌 환경(앱 웹뷰 등) 대비 — 직접 선택해 복사 */}
      {modalText !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-3" onClick={() => setModalText(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-2" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-900">문자 내용</p>
            <textarea readOnly value={modalText} rows={7} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 bg-snow border border-gray-200 rounded-lg text-xs text-gray-900 leading-relaxed" />
            <div className="flex justify-end gap-1.5">
              <button onClick={(e) => { const ta = (e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement | null); ta?.focus(); ta?.select(); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">전체 선택</button>
              <button onClick={() => setModalText(null)} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
