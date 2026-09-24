import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useMeta } from '../hooks/useMeta';
import EmptyState from '../components/EmptyState';
import LoadError from '../components/LoadError';
import { CalendarIcon } from '../components/Icons';
import { toastError, toastSuccess } from '../components/Toast';
import { SHOP_TYPE_LABEL, STATUS_CHIP, STATUS_LABEL, canCustomerCancel, isReservationFinished, detailLines, formatDateRange, nightsBetween, peopleLabel, shopPath, type Reservation, WORK_LABEL } from '../utils/reservation';

// 내 예약 (손님) — 렌탈·스키샵·정비샵·레슨·숙소에 보낸 방문 예약 목록. 결제 없음, 사장님이 확정하면 상태가 바뀐다.
type Filter = 'all' | 'requested' | 'confirmed' | 'closed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'requested', label: '요청됨' },
  { key: 'confirmed', label: '확정' },
  { key: 'closed', label: '거절·취소' },
];

const matches = (r: Reservation, f: Filter) =>
  f === 'all' ? true : f === 'closed' ? r.status === 'declined' || r.status === 'cancelled' : r.status === f;

export default function MyReservations() {
  useMeta({ title: '내 예약' });
  const [items, setItems] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    api<{ items: Reservation[] }>('/reservations/mine')
      .then((r) => setItems(Array.isArray(r?.items) ? r.items : []))
      .catch((err) => { setItems([]); setLoadError(err instanceof Error ? err.message : '예약을 불러오지 못했어요.'); })
      .finally(() => setLoading(false));
  }, [retryKey]);

  const shown = items.filter((r) => matches(r, filter));

  const cancel = async (r: Reservation) => {
    if (busy) return;
    if (!confirm(`${r.shopName} 예약을 취소할까요?`)) return;
    setBusy(r.id);
    try {
      const updated = await api<Reservation>(`/reservations/${r.id}/cancel`, { method: 'PUT' });
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
      toastSuccess('예약을 취소했어요.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '취소하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  // 끝난 예약 기록 정리 — 내 목록에서만 사라지고 상대방 기록·채팅은 유지 (2026-09-22)
  const hide = async (r: Reservation) => {
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
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 예약</h1>
      </div>
      <p className="text-xs text-gray-500 -mt-2">결제 없이 방문만 예약해요. 사장님이 확정하면 알림으로 알려 드려요.</p>

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
          title="아직 예약이 없어요."
          description={'렌탈샵·스키샵·정비샵·레슨·숙소 페이지에서\n방문 예약을 보낼 수 있어요.'}
          ctaLabel="렌탈샵 둘러보기"
          ctaTo="/rental"
        />
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">해당하는 예약이 없어요.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => {
            const nights = r.shopType === 'accommodation' ? nightsBetween(r.date, r.endDate) : 0;
            const when = `${formatDateRange(r.date, r.endDate)}${nights > 0 ? ` (${nights}박)` : ''}${r.time ? ` ${r.time}` : ''}`;
            return (
              <div key={r.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500">{SHOP_TYPE_LABEL[r.shopType] || '매장'}</p>
                    <Link to={shopPath(r.shopType, r.shopId)} className="block text-sm font-bold text-gray-900 truncate">{r.shopName}</Link>
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
                {r.note && <p className="text-xs text-gray-500 whitespace-pre-wrap">요청사항: {r.note}</p>}
                {r.ownerMessage && (
                  <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {r.status === 'declined' ? '거절 사유' : '사장님 메시지'}: {r.ownerMessage}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {r.roomId && (
                    <Link
                      to={`/chat/${r.roomId}`}
                      state={{ backTo: '/mypage/reservations' }}
                      className="flex-1 min-h-11 inline-flex items-center justify-center bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                    >채팅 열기</Link>
                  )}
                  {canCustomerCancel(r.status) && (
                    <button
                      type="button"
                      onClick={() => cancel(r)}
                      disabled={busy === r.id}
                      className="flex-1 min-h-11 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >{busy === r.id ? '처리 중...' : '예약 취소'}</button>
                  )}
                  {isReservationFinished(r) && (
                    <button
                      type="button"
                      onClick={() => hide(r)}
                      disabled={busy === r.id}
                      className="flex-1 min-h-11 bg-white text-gray-500 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-40"
                    >기록 삭제</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
