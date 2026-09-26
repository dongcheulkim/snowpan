import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import EmptyState from '../components/EmptyState';
import LoadError from '../components/LoadError';
import ReservationActions from '../components/ReservationActions';
import { CalendarIcon, UserIcon } from '../components/Icons';
import { toastError, toastSuccess } from '../utils/toast';
import { SHOP_TYPE_LABEL, STATUS_CHIP, STATUS_LABEL, detailLines, isReservationFinished, formatDateRange, nightsBetween, peopleLabel, shopPath, type Reservation, type ReservationParty, WORK_LABEL } from '../utils/reservation';

// 예약 관리 (사장님) — 내 매장들로 들어온 방문 예약. 요청 대기 건은 확정/거절, 확정 건은 취소할 수 있다. 결제 없음.
type ShopReservation = Reservation & { customer?: ReservationParty };
type Filter = 'requested' | 'confirmed' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'requested', label: '요청 대기' },
  { key: 'confirmed', label: '확정' },
  { key: 'all', label: '전체' },
];

const matches = (r: Reservation, f: Filter) => (f === 'all' ? true : r.status === f);

export default function ShopReservations() {
  useMeta({ title: '예약 관리' });
  const [items, setItems] = useState<ShopReservation[]>([]);
  const [filter, setFilter] = useState<Filter>('requested');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    api<{ items: ShopReservation[] }>('/reservations/shop')
      .then((r) => setItems(Array.isArray(r?.items) ? r.items : []))
      .catch((err) => { setItems([]); setLoadError(err instanceof Error ? err.message : '예약을 불러오지 못했어요.'); })
      .finally(() => setLoading(false));
  }, [retryKey]);

  const shown = items.filter((r) => matches(r, filter));

  const runAction = async (r: ShopReservation, action: 'confirm' | 'decline' | 'cancel' | 'work-status', text?: string) => {
    if (busy) return;
    setBusy(r.id);
    try {
      const body = action === 'confirm' ? { message: text || undefined } : action === 'decline' ? { reason: text || undefined } : action === 'work-status' ? { status: text } : undefined;
      const updated = await api<Reservation>(`/reservations/${r.id}/${action}`, { method: 'PUT', ...(body ? { body } : {}) });
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
      toastSuccess(action === 'confirm' ? '예약을 확정했어요. 손님에게 알림이 가요.' : action === 'decline' ? '예약을 거절했어요.' : action === 'work-status' ? '손님에게 작업 현황을 알렸어요.' : '예약을 취소했어요.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  const emptyByFilter = filter === 'requested' ? '요청 대기 중인 예약이 없어요.' : filter === 'confirmed' ? '확정한 예약이 없어요.' : '받은 예약이 없어요.';

  // 끝난 예약 기록 정리 — 내 목록에서만 사라지고 상대방 기록·채팅은 유지 (2026-09-22)
  const hide = async (r: ShopReservation) => {
    if (busy) return;
    if (!confirm('이 예약 기록을 내 목록에서 지울까요? 상대방 기록과 채팅은 그대로 남아요.')) return;
    setBusy(r.id);
    try {
      await api(`/reservations/${r.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      toastSuccess('예약 기록을 지웠어요.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '지우지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage/shops" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">예약 관리</h1>
      </div>
      <p className="text-xs text-gray-500 -mt-2">손님이 보낸 방문 예약이에요. 확정하거나 거절하면 손님에게 바로 알림이 가요.</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n = items.filter((r) => matches(r, f.key)).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 min-h-11 px-3.5 rounded-full text-xs font-bold border transition-colors ${filter === f.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {f.label}{items.length > 0 ? ` ${n}` : ''}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : loadError && items.length === 0 ? (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={48} strokeWidth={1.4} />}
          title="받은 예약이 없어요."
          description={'손님이 매장 페이지에서 방문 예약을 보내면\n여기에 모여요.'}
        />
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">{emptyByFilter}</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const nights = r.shopType === 'accommodation' ? nightsBetween(r.date, r.endDate) : 0;
            const when = `${formatDateRange(r.date, r.endDate)}${nights > 0 ? ` (${nights}박)` : ''}${r.time ? ` ${r.time}` : ''}`;
            const c = r.customer;
            return (
              <div key={r.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c?.id ? (
                      <Link to={`/seller/${c.id}`} className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 overflow-hidden flex-shrink-0">
                        {c.profileImage ? <img src={imageUrl(c.profileImage)} alt="" className="w-full h-full object-cover" /> : <UserIcon size={16} />}
                      </Link>
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0"><UserIcon size={16} /></span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{c?.name || '손님'}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {SHOP_TYPE_LABEL[r.shopType] || '매장'} · <Link to={shopPath(r.shopType, r.shopId)} className="underline underline-offset-2">{r.shopName}</Link>
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CHIP[r.status] || STATUS_CHIP.requested}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  {r.shopType === 'repair' && r.status === 'confirmed' && r.workStatus && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-gray-900 text-white border-gray-900">{WORK_LABEL[r.workStatus]}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800">{when} · {peopleLabel(r.adults, r.children)}</p>
                {detailLines(r.shopType, r.details).map((l) => <p key={l} className="text-xs text-gray-500">{l}</p>)}
                {r.note && <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">요청사항: {r.note}</p>}
                {r.ownerMessage && (
                  <p className="text-xs text-gray-500 whitespace-pre-wrap">
                    {r.status === 'declined' ? '거절 사유' : '보낸 메시지'}: {r.ownerMessage}
                  </p>
                )}
                {r.roomId && (
                  <Link
                    to={`/chat/${r.roomId}`}
                    state={{ backTo: '/mypage/shop-reservations' }}
                    className="block w-full min-h-11 py-3 text-center bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                  >채팅 열기</Link>
                )}
                <ReservationActions
                  status={r.status}
                  role="owner"
                  busy={busy === r.id}
                  onConfirm={(m) => runAction(r, 'confirm', m)}
                  onDecline={(reason) => runAction(r, 'decline', reason)}
                  onCancel={() => runAction(r, 'cancel')}
                  shopType={r.shopType}
                  workStatus={r.workStatus}
                  onWorkStatus={(s) => runAction(r, 'work-status', s)}
                />
                {isReservationFinished(r) && (
                  <button
                    type="button"
                    onClick={() => hide(r)}
                    disabled={busy === r.id}
                    className="block w-full min-h-11 py-3 text-center bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >기록 삭제</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
