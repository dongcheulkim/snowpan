import { toastError, toastSuccess } from '../components/Toast';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import {
  MaintenanceIcon, SkiShopIcon, RentalIcon, LessonIcon, AccommodationIcon,
} from '../components/CategoryIcons';
import KindTags from '../components/KindTags';
import LoadError from '../components/LoadError';
import OwnerAlertSettings from '../components/OwnerAlertSettings';
import type { ShopKind } from '../utils/shopKinds';

interface Shop {
  id: string;
  name: string;
  area?: string;
  price?: number;
  approved: boolean;
  claimable?: boolean; // 관리자 시딩 매장 — 사장님 확인 전 (관리자 대시보드에서만 보임)
  extraKinds?: string | null; // 겸업 칩 (스키샵·정비샵·렌탈샵만)
  _src?: CatKey; // 원래 등록된 카테고리 — 겸업으로 다른 섹션에 표시될 때 수정·소식·삭제는 이 카테고리 기준
  viewCount?: number;
  createdAt: string;
  staffRole?: 'staff'; // 내 매장이 아니라 직원으로 붙은 매장 (2026-09-23) — 삭제·직원 관리 대신 '나가기'
}

// 매장 카드 버튼 — 스노우판 시그니처(흰·검)로 통일, 열린 패널만 검정 (2026-09-23)
const BTN = 'flex-1 min-w-[4.5rem] whitespace-nowrap py-1.5 text-xs font-bold rounded-md border transition-colors';
const BTN_OFF = `${BTN} bg-white text-gray-900 border-gray-200 hover:bg-gray-50`;
const BTN_ON = `${BTN} bg-gray-900 text-white border-gray-900`;
const BTN_DANGER = `${BTN} bg-white text-red-500 border-gray-200 hover:bg-red-50`;

// 직원 관리 패널 데이터 (사장님만 조회)
interface StaffInfo {
  staff: { userId: string; name: string; profileImage?: string | null; since: string }[];
  invite: { code: string; url: string; expiresAt: string; usedCount: number; maxUses: number } | null;
}

// 모집·신청 (앰버서더 등) — 사장님·직원이 모집 글을 올리고 신청자(이름·연락처·인스타·한마디)를 확인한다. 2026-09-23 사용자 요청 "가입해서 신청하게, 사장님은 확인만"
interface RecruitItem { id: string; title: string; description: string; deadline: string | null; closed: boolean; active: boolean; createdAt: string; applicationCount: number; shopType: string; shopId: string }
interface Applicant { id: string; name: string; phone: string; instagram: string | null; message: string | null; createdAt: string; user: { id: string; name: string } }
function RecruitPanel({ shopType, shopId, shopName, approved }: { shopType: string; shopId: string; shopName: string; approved: boolean }) {
  const [items, setItems] = useState<RecruitItem[] | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [apps, setApps] = useState<Record<string, Applicant[]>>({});
  const load = () => api<{ items: RecruitItem[] }>('/recruits/mine').then((d) => setItems((d.items || []).filter((r) => r.shopType === shopType && r.shopId === shopId))).catch((e) => toastError(e instanceof Error ? e.message : '모집을 불러오지 못했어요.'));
  useEffect(() => { load(); }, [shopType, shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => {
    if (title.trim().length < 2) { toastError('제목을 2자 이상 적어 주세요.'); return; }
    if (description.trim().length < 5) { toastError('모집 내용을 5자 이상 적어 주세요.'); return; }
    setBusy(true);
    try { await api('/recruits', { method: 'POST', body: { shopType, shopId, title: title.trim(), description: description.trim(), deadline: deadline || undefined } }); toastSuccess('모집을 올렸어요. 매장 페이지에 바로 보여요.'); setWriting(false); setTitle(''); setDescription(''); setDeadline(''); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '올리지 못했어요.'); }
    finally { setBusy(false); }
  };
  const toggleClosed = async (r: RecruitItem) => {
    try { await api(`/recruits/${r.id}`, { method: 'PUT', body: { closed: !r.closed } }); toastSuccess(r.closed ? '다시 열었어요.' : '마감했어요.'); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const remove = async (r: RecruitItem) => {
    if (!confirm(`"${r.title}" 모집을 지울까요? 신청서 ${r.applicationCount}건도 함께 지워져요.`)) return;
    try { await api(`/recruits/${r.id}`, { method: 'DELETE' }); toastSuccess('지웠어요.'); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '지우지 못했어요.'); }
  };
  const showApps = async (r: RecruitItem) => {
    if (open === r.id) { setOpen(null); return; }
    setOpen(r.id);
    try { const d = await api<{ items: Applicant[] }>(`/recruits/${r.id}/applications`); setApps((m) => ({ ...m, [r.id]: d.items || [] })); }
    catch (e) { toastError(e instanceof Error ? e.message : '신청자를 불러오지 못했어요.'); }
  };
  const link = (r: RecruitItem) => `${window.location.origin}/recruit/${r.id}`;
  const share = async (r: RecruitItem) => {
    const url = link(r);
    if (navigator.share) { try { await navigator.share({ title: `${shopName} ${r.title}`, text: r.description.slice(0, 80), url }); return; } catch { /* 취소 */ } }
    try { await navigator.clipboard.writeText(url); toastSuccess('링크를 복사했어요. 인스타·카톡에 올려 주세요.'); } catch { toastError('복사하지 못했어요.'); }
  };
  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400';
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
      <p className="text-[11px] text-gray-500 leading-relaxed">앰버서더·시즌 직원 같은 모집을 올리면 매장 페이지에 "모집 중" 카드가 뜨고, 링크를 인스타·카톡에 올리면 스노우판에 가입해서 신청해요. 신청자의 이름·연락처는 여기서만 볼 수 있어요.</p>
      {items === null ? <p className="text-xs text-gray-400">불러오는 중...</p> : items.length === 0 && !writing ? <p className="text-xs text-gray-500">아직 올린 모집이 없어요.</p> : null}
      {items?.map((r) => (
        <div key={r.id} className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{r.title}</p>
              <p className="text-[10px] text-gray-500">{r.active ? (r.deadline ? `${r.deadline.replace(/-/g, '.')}까지` : '무기한') : '마감'} · 신청 {r.applicationCount}명</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${r.active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>{r.active ? '모집 중' : '마감'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => showApps(r)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-md ${open === r.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>신청자 {r.applicationCount}</button>
            <button onClick={() => share(r)} className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-gray-200 text-gray-700 rounded-md">링크 보내기</button>
            <button onClick={() => toggleClosed(r)} className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-gray-200 text-gray-700 rounded-md">{r.closed ? '다시 열기' : '마감'}</button>
            <button onClick={() => remove(r)} className="px-2.5 py-1.5 text-[11px] font-bold text-red-500 bg-white border border-red-100 rounded-md">삭제</button>
          </div>
          {open === r.id && (
            <div className="space-y-1.5 pt-1">
              {!apps[r.id] ? <p className="text-[11px] text-gray-400">불러오는 중...</p> : apps[r.id].length === 0 ? <p className="text-[11px] text-gray-500">아직 신청자가 없어요.</p> : apps[r.id].map((a) => (
                <div key={a.id} className="bg-white rounded-md border border-gray-100 p-2 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between"><span className="font-bold text-gray-900">{a.name}</span><span className="text-gray-400">{new Date(a.createdAt).toLocaleDateString('ko-KR')}</span></div>
                  <p><a href={`tel:${a.phone}`} className="text-gray-900 underline underline-offset-2">{a.phone}</a>{a.instagram && <> · <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-500">@{a.instagram}</a></>}</p>
                  {a.message && <p className="text-gray-700 whitespace-pre-wrap">{a.message}</p>}
                  <p className="text-gray-400">스노우판 {a.user.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {writing ? (
        <div className="space-y-1.5">
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="제목 (예: 26/27 스노우메타 앰버서더 모집)" className={inputClass} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))} rows={4} placeholder="모집 내용 (혜택, 조건, 활동 기간, 인원 등)" className={`${inputClass} resize-none`} />
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">마감일 (선택)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className="flex-1 py-2 text-xs font-bold bg-gray-900 text-white rounded-md disabled:opacity-40">{busy ? '올리는 중...' : '모집 올리기'}</button>
            <button onClick={() => setWriting(false)} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-md">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setWriting(true)} disabled={!approved} className="w-full py-2 text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40">{approved ? '+ 새 모집 올리기' : '매장 승인 후 모집을 올릴 수 있어요'}</button>
      )}
    </div>
  );
}

// 직원 관리 — 사장님이 초대 링크를 만들어 직원에게 보내고, 참여한 직원을 해제한다. 2026-09-23 사용자 요청 "직원이 관리하는 경우도 있잖아".
// 컴포넌트 재생성으로 상태가 날아가지 않게 MyShops 밖에 둔다.
function StaffPanel({ shopType, shopId, shopName, approved }: { shopType: string; shopId: string; shopName: string; approved: boolean }) {
  const [data, setData] = useState<StaffInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<StaffInfo>(`/shop-staff/shops/${shopType}/${shopId}`).then(setData).catch((e) => toastError(e instanceof Error ? e.message : '직원 목록을 불러오지 못했어요.'));
  useEffect(() => { load(); }, [shopType, shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  const makeInvite = async () => {
    setBusy(true);
    try { await api(`/shop-staff/shops/${shopType}/${shopId}/invites`, { method: 'POST' }); toastSuccess('초대 링크를 만들었어요. 직원에게 보내 주세요.'); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '초대 링크를 만들지 못했어요.'); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!confirm('초대 링크를 없앨까요? 이미 참여한 직원은 그대로예요.')) return;
    try { await api(`/shop-staff/shops/${shopType}/${shopId}/invites`, { method: 'DELETE' }); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const remove = async (userId: string, name: string) => {
    if (!confirm(`${name}님을 직원에서 해제할까요?`)) return;
    try { await api(`/shop-staff/shops/${shopType}/${shopId}/staff/${userId}`, { method: 'DELETE' }); toastSuccess('해제했어요.'); await load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toastSuccess('링크를 복사했어요.'); }
    catch { toastError('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.'); }
  };
  const share = async (url: string) => {
    if (navigator.share) {
      try { await navigator.share({ title: `${shopName} 직원 초대`, text: `스노우판에서 '${shopName}' 매장을 함께 관리해요. 링크를 열고 참여를 눌러 주세요.`, url }); } catch { /* 공유 취소 */ }
    } else await copy(url);
  };
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
      <p className="text-[11px] text-gray-500 leading-relaxed">직원은 예약 확정·거절, 매장 정보 수정, 소식·이벤트, 리뷰 답글, 광고 신청을 함께 할 수 있어요. 매장 삭제와 직원 관리는 사장님만 할 수 있고, 손님 문의 채팅은 사장님 계정으로 와요.</p>
      {!data ? <p className="text-xs text-gray-400">불러오는 중...</p> : (
        <>
          {data.staff.length === 0
            ? <p className="text-xs text-gray-500">아직 직원이 없어요.</p>
            : data.staff.map((s) => (
              <div key={s.userId} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-900">{s.name} <span className="text-[10px] text-gray-400 font-normal">{new Date(s.since).toLocaleDateString('ko-KR')}부터</span></span>
                <button onClick={() => remove(s.userId, s.name)} className="text-[11px] text-red-500 px-1.5 py-1">해제</button>
              </div>
            ))}
          {data.invite ? (
            <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
              <p className="text-[11px] text-gray-500">초대 링크 · {new Date(data.invite.expiresAt).toLocaleDateString('ko-KR')}까지 · {data.invite.usedCount}/{data.invite.maxUses}명 참여</p>
              <p className="text-[11px] text-gray-800 break-all select-all">{data.invite.url}</p>
              <div className="flex gap-2">
                <button onClick={() => share(data.invite!.url)} className="flex-1 min-w-[4.5rem] whitespace-nowrap py-1.5 text-xs font-bold text-white bg-gray-900 rounded-md">직원에게 보내기</button>
                <button onClick={() => copy(data.invite!.url)} className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md">복사</button>
                <button onClick={revoke} className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-md">없애기</button>
              </div>
            </div>
          ) : (
            <button onClick={makeInvite} disabled={busy || !approved} className="w-full py-2 text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40">
              {approved ? (busy ? '만드는 중...' : '초대 링크 만들기') : '매장 승인 후 초대할 수 있어요'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface ShopPostItem {
  id: string;
  title: string;
  postType: string;
  pinned: boolean;
  viewCount: number;
  createdAt: string;
}

// 사장님이 등록/관리하는 5개 업종. endpoint=목록조회, registerPath=등록,
// editBase=수정경로 prefix(/edit 붙음), deleteBase=삭제 API prefix.
const CATEGORIES = [
  { key: 'skishop', label: '스키·보드샵', Icon: SkiShopIcon, endpoint: '/ski-shops/my', registerPath: '/skishop/register', editBase: '/skishop', deleteBase: '/ski-shops', hasViews: true },
  { key: 'repair', label: '정비샵', Icon: MaintenanceIcon, endpoint: '/repair-shops/my', registerPath: '/repair/register', editBase: '/repair', deleteBase: '/repair-shops', hasViews: true },
  { key: 'rental', label: '렌탈샵', Icon: RentalIcon, endpoint: '/rentals/my', registerPath: '/rental/register', editBase: '/rental', deleteBase: '/rentals', hasViews: false },
  { key: 'lesson', label: '레슨', Icon: LessonIcon, endpoint: '/lessons/my', registerPath: '/lesson/register', editBase: '/lesson', deleteBase: '/lessons', hasViews: false },
  { key: 'accommodation', label: '숙소', Icon: AccommodationIcon, endpoint: '/accommodations/my', registerPath: '/accommodation/register', editBase: '/accommodation', deleteBase: '/accommodations', hasViews: false },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];

const POST_TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '일반', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

export default function MyShops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Record<CatKey, Shop[]>>({
    skishop: [], repair: [], rental: [], lesson: [], accommodation: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 매장 목록 로드 실패 메시지 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0); // '다시 시도' — 목록 이펙트 재실행
  // 소식 패널 — 매장별 토글. key = `${cat.key}:${shop.id}`
  const [openPanel, setOpenPanel] = useState<string | null>(null); // 소식·모집·직원 패널 — 한 번에 하나만 열림 ('news:키' | 'recruit:키' | 'staff:키'), 사용자 요청 2026-09-23
  const [posts, setPosts] = useState<Record<string, ShopPostItem[]>>({});
  const [postsLoading, setPostsLoading] = useState<string | null>(null);
  // 예약 관리 진입 카드의 "요청 N건" — 사장님이 아직 답하지 않은 방문 예약 수 (조회 실패면 건수 없이 카드만)
  const [pendingReservations, setPendingReservations] = useState<number | null>(null);
  useEffect(() => {
    api<{ items: unknown[] }>('/reservations/shop?status=requested')
      .then((r) => setPendingReservations(Array.isArray(r?.items) ? r.items.length : 0))
      .catch(() => setPendingReservations(null));
  }, [retryKey]);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      setLoadError(null);
      // 다섯 업종을 한꺼번에 조회 — 하나라도 실패하면 메시지를 기록 (등록 매장이 하나도 안 보일 때 재시도 안내)
      Promise.all(
        CATEGORIES.map((c) => api<Shop[]>(c.endpoint).catch((err) => { setLoadError(err instanceof Error ? err.message : '매장 목록을 불러오지 못했어요.'); return [] as Shop[]; }))
      ).then((results) => {
        const next = {} as Record<CatKey, Shop[]>;
        CATEGORIES.forEach((c, i) => {
          next[c.key] = (Array.isArray(results[i]) ? results[i] : []).map((s) => ({ ...s, _src: c.key }));
        });
        // 겸업 매장은 겸업 카테고리 섹션에도 같이 표시 — 같은 매장(같은 데이터)을 카테고리별로 따로 관리하는 느낌으로
        for (const k of ['skishop', 'repair', 'rental'] as const) {
          for (const s of next[k]) {
            for (const ek of (s.extraKinds || '').split(',').filter(Boolean) as CatKey[]) {
              if (ek !== k && next[ek]) next[ek].push(s);
            }
          }
        }
        setShops(next);
      }).finally(() => setLoading(false));
    };
    load();
  }, [retryKey]);

  const handleDelete = async (cat: typeof CATEGORIES[number], shop: Shop) => {
    if (!confirm(`"${shop.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api(`${cat.deleteBase}/${shop.id}`, { method: 'DELETE' });
      // 원 카테고리에서 삭제되면 겸업으로 표시되던 다른 섹션에서도 사라짐
      setShops((prev) => Object.fromEntries(Object.entries(prev).map(([k, list]) => [k, list.filter((s) => s.id !== shop.id)])) as Record<CatKey, Shop[]>);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  // 겸업 섹션에서 "여기서 내리기" — 겸업 칩만 빼는 수정 (증빙·재심사 없음)
  // 직원으로 붙은 매장에서 스스로 나가기
  const handleLeave = async (cat: typeof CATEGORIES[number], shop: Shop) => {
    if (!confirm(`"${shop.name}" 매장 관리에서 나갈까요? 사장님이 다시 초대하면 참여할 수 있어요.`)) return;
    const me = getUser();
    if (!me) return;
    try {
      await api(`/shop-staff/shops/${shop._src || cat.key}/${shop.id}/staff/${me.id}`, { method: 'DELETE' });
      setShops((prev) => ({ ...prev, [cat.key]: prev[cat.key].filter((s) => s.id !== shop.id) }));
      toastSuccess('매장 관리에서 나왔어요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '처리하지 못했어요.');
    }
  };

  const handleUnlink = async (src: typeof CATEGORIES[number], cat: typeof CATEGORIES[number], shop: Shop) => {
    if (!confirm(`"${shop.name}"을(를) ${cat.label} 목록에서 내릴까요? (${src.label} 등록은 그대로 유지됩니다)`)) return;
    try {
      const remaining = (shop.extraKinds || '').split(',').filter((k) => k && k !== cat.key);
      await api(`${src.deleteBase}/${shop.id}`, { method: 'PUT', body: { extraKinds: remaining } });
      const nextExtra = remaining.join(',') || null;
      setShops((prev) => {
        const out = { ...prev } as Record<CatKey, Shop[]>;
        out[cat.key] = prev[cat.key].filter((s) => !(s.id === shop.id && s._src === src.key));
        for (const k of Object.keys(out) as CatKey[]) out[k] = out[k].map((s) => (s.id === shop.id ? { ...s, extraKinds: nextExtra } : s));
        return out;
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : '변경 실패');
    }
  };

  const toggleNews = async (cat: typeof CATEGORIES[number], shop: Shop) => {
    const key = `${cat.key}:${shop.id}`;
    const srcKey = shop._src || cat.key; // 소식은 원 카테고리 기준 (한 매장 = 하나의 소식 피드)
    if (openPanel === `news:${key}`) { setOpenPanel(null); return; }
    setOpenPanel(`news:${key}`);
    if (posts[key]) return; // 이미 불러옴
    setPostsLoading(key);
    try {
      const res = await api<{ items: ShopPostItem[] }>(`/shop-posts?shopType=${srcKey}&shopId=${shop.id}&limit=20`);
      setPosts((prev) => ({ ...prev, [key]: Array.isArray(res?.items) ? res.items : [] }));
    } catch {
      setPosts((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setPostsLoading(null);
    }
  };

  const handleDeletePost = async (key: string, post: ShopPostItem) => {
    if (!confirm(`소식 "${post.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api(`/shop-posts/${post.id}`, { method: 'DELETE' });
      setPosts((prev) => ({ ...prev, [key]: (prev[key] || []).filter((p) => p.id !== post.id) }));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const NewsPanel = ({ shop, cat }: { shop: Shop; cat: typeof CATEGORIES[number] }) => {
    const key = `${cat.key}:${shop.id}`;
    const srcKey = shop._src || cat.key;
    const list = posts[key] || [];
    return (
      <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
        {shop.approved ? (
          <Link
            to={`/shop/${srcKey}/${shop.id}/post/new`}
            className="block w-full py-2 text-center text-xs font-bold text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
          >
            + 소식·이벤트 쓰기
          </Link>
        ) : (
          <p className="text-[11px] text-gray-500 text-center py-1">매장 승인 후에 새 소식을 올릴 수 있어요.</p>
        )}
        {postsLoading === key ? (
          <p className="text-[11px] text-gray-400 text-center py-2">불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-2">아직 올린 소식이 없어요.</p>
        ) : (
          list.map((p) => {
            const t = POST_TYPE_LABEL[p.postType] || POST_TYPE_LABEL.general;
            return (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-100">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${t.color}`}>{t.text}</span>
                <Link to={`/shop-post/${p.id}`} className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate">{p.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString('ko-KR')} · 조회 {(p.viewCount ?? 0).toLocaleString()}
                  </p>
                </Link>
                <button onClick={() => navigate(`/shop-post/${p.id}/edit`)} className="shrink-0 text-[11px] font-bold text-gray-900 px-1.5 py-1">수정</button>
                <button onClick={() => handleDeletePost(key, p)} className="shrink-0 text-[11px] font-bold text-red-500 px-1.5 py-1">삭제</button>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const ShopCard = ({ shop, cat }: { shop: Shop; cat: typeof CATEGORIES[number] }) => {
    const key = `${cat.key}:${shop.id}`;
    const src = CATEGORIES.find((c) => c.key === (shop._src || cat.key)) || cat; // 수정·삭제·소식은 원 카테고리 API
    const isGuest = src.key !== cat.key; // 겸업으로 이 섹션에 표시된 매장
    const sub = [
      shop.area,
      cat.hasViews ? `조회 ${(shop.viewCount ?? 0).toLocaleString()}` : (shop.price ? `${shop.price.toLocaleString()}원` : null),
    ].filter(Boolean).join(' · ');
    return (
      <div className="p-3 bg-snow rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-gray-700"><cat.Icon size={20} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{shop.name}</p>
                {(cat.key === 'skishop' || cat.key === 'repair' || cat.key === 'rental') && <KindTags shop={shop} own={cat.key as ShopKind} />}
              </div>
              {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
              {isGuest && <p className="text-[10px] text-gray-600">{src.label}으로 등록된 매장 · {cat.label} 겸업</p>}
            </div>
          </div>
          <span className="flex items-center gap-1 flex-shrink-0">
            {shop.staffRole === 'staff' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-gray-900 border border-gray-900">직원</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shop.claimable ? 'bg-gray-100 text-gray-600' : shop.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {shop.claimable ? '사장님 확인 전' : shop.approved ? '승인됨' : '대기중'}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
          <button onClick={() => navigate(`${src.editBase}/${shop.id}/edit`)} className={BTN_OFF}>수정</button>
          <button onClick={() => toggleNews(cat, shop)} className={openPanel === `news:${key}` ? BTN_ON : BTN_OFF}>소식·이벤트</button>
          {!isGuest && <button onClick={() => setOpenPanel(openPanel === `recruit:${key}` ? null : `recruit:${key}`)} className={openPanel === `recruit:${key}` ? BTN_ON : BTN_OFF}>모집</button>}
          {isGuest
            ? <button onClick={() => handleUnlink(src, cat, shop)} className={BTN_OFF}>여기서 내리기</button>
            : shop.staffRole === 'staff'
              ? <button onClick={() => handleLeave(cat, shop)} className={BTN_OFF}>나가기</button>
              : (
                <>
                  <button onClick={() => setOpenPanel(openPanel === `staff:${key}` ? null : `staff:${key}`)} className={openPanel === `staff:${key}` ? BTN_ON : BTN_OFF}>직원</button>
                  <button onClick={() => handleDelete(cat, shop)} className={BTN_DANGER}>삭제</button>
                </>
              )}
        </div>
        {openPanel === `news:${key}` && <NewsPanel shop={shop} cat={cat} />}
        {openPanel === `staff:${key}` && !isGuest && shop.staffRole !== 'staff' && <StaffPanel shopType={src.key} shopId={shop.id} shopName={shop.name} approved={shop.approved} />}
        {openPanel === `recruit:${key}` && !isGuest && <RecruitPanel shopType={src.key} shopId={shop.id} shopName={shop.name} approved={shop.approved} />}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

  const all = CATEGORIES.flatMap((c) => shops[c.key].filter((s) => (s._src || c.key) === c.key)); // 겸업 중복 제외
  const totalShops = all.length;
  const totalViews = all.reduce((n, s) => n + (s.viewCount ?? 0), 0);
  // 내가 등록한 업종만 노출 (등록 안 한 카테고리는 숨김).
  const visibleCategories = CATEGORIES.filter((c) => shops[c.key].length > 0);

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">사장님 대시보드</h1>
        </div>
        <Link to="/mypage/ads" className="text-xs text-gray-900 font-bold underline underline-offset-2">광고 관리</Link>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        매장 정보 수정, 소식·이벤트 등록, 신규 등록까지 여기서 한번에 관리하세요.{' '}
        <Link to="/partners/find" className="text-gray-700 underline underline-offset-2">이미 올라온 내 매장 찾기</Link>
      </p>

      {totalShops > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalShops}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">등록 업소</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">총 조회수</div>
          </div>
        </div>
      )}

      {/* 알림 받기 — 예약 요청·새 문의·승인 결과 문자·메일 채널 설정 (매장이 있을 때만) */}
      {totalShops > 0 && <OwnerAlertSettings />}

      {/* 예약 관리 — 손님이 보낸 방문 예약(결제 없음)을 확정·거절하는 곳. 매장이 하나도 없으면 숨김 */}
      {totalShops > 0 && (
        <Link to="/mypage/shop-reservations" className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900">예약 관리{pendingReservations !== null ? ` · 요청 ${pendingReservations}건` : ''}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">손님이 보낸 방문 예약을 확정하거나 거절할 수 있어요.</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!!pendingReservations && (
              <span className="bg-coral text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{pendingReservations > 99 ? '99+' : pendingReservations}</span>
            )}
            <span className="text-gray-500 text-xs">→</span>
          </div>
        </Link>
      )}

      {visibleCategories.length === 0 && (loadError ? (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500">아직 등록한 매장이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">아래에서 업종을 선택해 첫 매장을 등록해보세요.</p>
        </div>
      ))}

      {visibleCategories.map((cat) => (
        <div key={cat.key} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
              <cat.Icon size={16} /> {cat.label}
            </h2>
            <Link to={cat.registerPath} className="text-xs text-gray-900 font-bold underline underline-offset-2">+ 추가 등록</Link>
          </div>
          <div className="space-y-2">
            {shops[cat.key].map((s) => <ShopCard key={`${s._src || cat.key}:${s.id}`} shop={s} cat={cat} />)}
          </div>
        </div>
      ))}

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">새 매장 등록</h2>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to={cat.registerPath}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              <cat.Icon size={20} />
              <span className="text-[10px] font-medium">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
