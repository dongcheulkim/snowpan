import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { loginPath } from '../utils/loginPath';
import { toastError } from '../utils/toast';

// 매장 찜 + 답장 속도 (2026-09-24) — 상세 5종 공용. 찜하면 매장 소식·이벤트 알림. 답장 속도는 문의 3건 이상 쌓인 매장만 표시.
interface Status { following: boolean; count: number }
interface ResponseStat { label: string | null; replyRate: number | null }

export default function ShopFollowBar({ shopType, shopId }: { shopType: string; shopId: string }) {
  const navigate = useNavigate();
  const user = getUser();
  const [status, setStatus] = useState<Status>({ following: false, count: 0 });
  const [stat, setStat] = useState<ResponseStat | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Status>(`/shop-follows/status/${shopType}/${shopId}`).then((s) => { if (alive) setStatus(s); }).catch(() => {});
    api<ResponseStat>(`/shop-stats/response/${shopType}/${shopId}`).then((s) => { if (alive) setStat(s); }).catch(() => {});
    return () => { alive = false; };
  }, [shopType, shopId]);

  const toggle = async () => {
    if (!user) { navigate(loginPath()); return; }
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<Status>(`/shop-follows/${shopType}/${shopId}`, { method: status.following ? 'DELETE' : 'POST' });
      setStatus(r);
    } catch {
      toastError('잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={status.following}
          className={`min-h-10 px-4 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${status.following ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
        >
          {status.following ? '찜한 매장' : '매장 찜'}{status.count > 0 ? ` ${status.count}` : ''}
        </button>
        {stat?.label && (
          <p className="text-[11px] text-gray-500 text-right">{stat.label}{stat.replyRate != null ? ` · 답장률 ${stat.replyRate}%` : ''}</p>
        )}
      </div>
      {!status.following && <p className="text-[10px] text-gray-500">찜하면 이 매장의 소식과 이벤트 알림을 받아요.</p>}
    </div>
  );
}
