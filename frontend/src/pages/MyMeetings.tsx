import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import EmptyState from '../components/EmptyState';
import LoadError from '../components/LoadError';
import { CalendarIcon } from '../components/Icons';
import { MEETING_STATUS_CHIP, MEETING_STATUS_LABEL, isMeetingOpen, meetingWhen, type TradeMeeting } from '../utils/tradeMeeting';

// 내 거래 약속 (2026-10-09) — 중고 채팅에서 잡은 약속 목록. 수락·취소·거래 확정은 채팅방 카드에서 한다.
type Filter = 'open' | 'done' | 'closed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: '진행 중' },
  { key: 'done', label: '거래 완료' },
  { key: 'closed', label: '취소·거절' },
];
const matches = (m: TradeMeeting, f: Filter) => (f === 'open' ? isMeetingOpen(m.status) : f === 'done' ? m.status === 'done' : m.status === 'cancelled' || m.status === 'declined');

export default function MyMeetings() {
  useMeta({ title: '거래 약속' });
  const [items, setItems] = useState<TradeMeeting[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true); setLoadError(null);
    api<{ items: TradeMeeting[] }>('/trade-meetings/mine')
      .then((r) => { const list = Array.isArray(r?.items) ? r.items : []; setItems(list); if (!list.some((m) => isMeetingOpen(m.status))) setFilter(list.some((m) => m.status === 'done') ? 'done' : list.length ? 'closed' : 'open'); }) // 진행 중이 없으면 있는 탭을 먼저
      .catch((err) => { setItems([]); setLoadError(err instanceof Error ? err.message : '약속을 불러오지 못했어요.'); })
      .finally(() => setLoading(false));
  }, [retryKey]);

  // 진행 중은 가까운 날짜가 먼저, 나머지는 최근 것이 먼저
  const shown = items.filter((m) => matches(m, filter)).sort((a, b) => (filter === 'open' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Link to="/mypage" className="text-gray-500 text-sm">←</Link>
        <h1 className="text-lg font-bold text-gray-900">거래 약속</h1>
      </div>
      <p className="text-xs text-gray-500 mb-3">중고 채팅에서 잡은 약속이에요. 수락·취소·거래 확정은 채팅방에서 할 수 있어요.</p>
      <div className="flex gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`min-h-9 px-3 rounded-full text-xs font-bold border ${filter === f.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-12">불러오는 중...</p>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={48} strokeWidth={1.4} />}
          title="아직 거래 약속이 없어요."
          description={'중고 매물 채팅방에서 "약속" 버튼으로\n날짜·장소를 제안할 수 있어요.'}
          ctaLabel="중고 장비 보기"
          ctaTo="/used"
        />
      ) : shown.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">해당하는 약속이 없어요.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((m) => (
            <Link key={m.id} to={`/chat/${m.roomId}`} className="card p-3 flex items-center gap-3 card-hover block">
              <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {m.productImage && (m.productImage.startsWith('http') || m.productImage.startsWith('/')) && <img src={imageUrl(m.productImage, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${MEETING_STATUS_CHIP[m.status]}`}>{MEETING_STATUS_LABEL[m.status]}</span>
                  <span className="text-[11px] text-gray-500 truncate">{m.viewerRole === 'seller' ? '구매자' : '판매자'} {m.other?.name || '회원'}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{meetingWhen(m)}</p>
                <p className="text-[11px] text-gray-500 truncate">{m.productName}</p>
              </div>
              <span className="text-gray-400 flex-shrink-0">&gt;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
