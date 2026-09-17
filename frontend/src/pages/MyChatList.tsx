import { useState, useEffect } from 'react';
import { loginPath } from '../utils/loginPath';
import { Link } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import EmptyState from '../components/EmptyState';
import LoadError from '../components/LoadError';
import { ListRowSkeleton } from '../components/Skeleton';
import { ChatIcon, CloseIcon, UserIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../components/Toast';

interface ChatRoom {
  id: string;
  user1: { id: string; name: string; profileImage?: string | null };
  user2: { id: string; name: string; profileImage?: string | null };
  otherUser?: { id: string; name: string; profileImage?: string | null } | null;
  messages: { content: string; createdAt: string; type?: string; senderId?: string }[];
  unreadCount: number;
  updatedAt: string;
  status?: string;        // 'accepted' | 'pending' — 채팅 요청 게이트
  requestedBy?: string | null;
}

const renderPreview = (msg: { content: string; type?: string }): string => {
  if (msg.type === 'product_inquiry') {
    try {
      const parsed = JSON.parse(msg.content) as { productName?: string };
      return `[상품] "${parsed.productName || '상품'}" 문의`;
    } catch { return '[상품] 상품 문의'; }
  }
  if (msg.type === 'price_offer') {
    const n = parseInt(msg.content, 10);
    return Number.isFinite(n) ? `[가격] ${n.toLocaleString()}원 제안` : '[가격] 가격 제안';
  }
  if (msg.type === 'image') return '[사진]';
  if (msg.type === 'ad_invite') {
    try {
      const parsed = JSON.parse(msg.content) as { slotLabel?: string };
      return `[광고] ${parsed.slotLabel || '광고'} 신청 링크`;
    } catch { return '[광고] 광고 신청 링크'; }
  }
  return msg.content;
};

const MyChatList = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [chatFilter, setChatFilter] = useState<'all' | 'unanswered'>('all'); // 관리자 전용 필터
  const [loading, setLoading] = useState(true);
  // 마지막 요청 실패 메시지 — 성공하면 지움. 폴링 실패는 기존 목록을 유지하고, 목록이 비어 있을 때만 재시도 안내
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0); // '다시 시도' — 목록 이펙트(폴링 포함) 재시작
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  // 목록은 소켓이 없어 새 메시지가 와도 그대로였음 → 화면에 돌아올 때·앱 복귀 때·20초마다 다시 불러온다 (2026-09-14)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () => api<ChatRoom[] | { items: ChatRoom[] }>('/chat/rooms')
      .then((data) => {
        if (!alive) return;
        // 배열 또는 {items: []} 둘 다 대응
        const list = Array.isArray(data) ? data : (data as { items?: ChatRoom[] })?.items || [];
        setRooms(list);
        setLoadError(null);
      })
      .catch((err) => { if (alive) setLoadError(err instanceof Error ? err.message : '채팅 목록을 불러오지 못했어요.'); })
      .finally(() => { if (alive) setLoading(false); });
    load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 20000);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); window.clearInterval(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const handleDelete = async (roomId: string, otherName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 내 목록에서만 사라진다 — 상대방 쪽 대화 내역은 그대로 남는다 (거래 분쟁·사기 예방)
    if (!confirm(`${otherName}님과의 대화를 내 목록에서 지울까요?\n상대방에게는 대화 내용이 그대로 남아요. 새 메시지가 오면 다시 표시돼요.`)) return;
    // optimistic update
    const prev = rooms;
    setRooms(rooms.filter(r => r.id !== roomId));
    try {
      await api(`/chat/rooms/${roomId}`, { method: 'DELETE' });
      toastSuccess('내 목록에서 지웠어요');
    } catch (err) {
      setRooms(prev);
      toastError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (!user) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-gray-500 mb-4">{t('chat.loginRequired')}</p>
        <Link to={loginPath()} className="text-primary-dark hover:underline text-sm">{t('chat.loginLink')}</Link>
      </div>
    );
  }

  // 관리자: 손님이 마지막으로 말한 방(= 아직 답 안 한 문의)만 골라 보기 (2026-09-17, 하루 요약의 '답 없는 문의'와 같은 기준·시간 제한 없음)
  const isAdmin = user.role === 'admin';
  const isUnanswered = (r: ChatRoom) => { const last = r.messages && r.messages[0]; const other = r.otherUser || (r.user1.id === user.id ? r.user2 : r.user1); return !!last && !!last.senderId && last.senderId === other.id; };
  const unansweredCount = isAdmin ? rooms.filter(isUnanswered).length : 0;
  const shownRooms = isAdmin && chatFilter === 'unanswered' ? rooms.filter(isUnanswered) : rooms;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">&larr;</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('myChatList.title')}</h1>
      </div>
      {isAdmin && rooms.length > 0 && (
        <div className="flex items-center gap-2">
          {([['all', `전체 ${rooms.length}`], ['unanswered', `답 안 한 문의 ${unansweredCount}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setChatFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${chatFilter === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </div>
      ) : loadError && rooms.length === 0 ? (
        <LoadError message={loadError} onRetry={() => { setLoading(true); setLoadError(null); setRetryKey((k) => k + 1); }} />
      ) : isAdmin && chatFilter === 'unanswered' && shownRooms.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">답 안 한 문의가 없어요.</div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={48} strokeWidth={1.4} />}
          title={t('myChatList.empty')}
          description="관심 있는 상품에 메시지를 보내 거래를 시작해보세요."
          ctaLabel="장비 둘러보기"
          ctaTo="/used"
        />
      ) : (
        <div className="space-y-2">
          {shownRooms.filter(r => r && r.user1 && r.user2).map((room) => {
            const other = room.otherUser || (room.user1.id === user.id ? room.user2 : room.user1);
            const lastMsg = (room.messages && room.messages[0]) || null;
            return (
              <Link
                to={`/chat/${room.id}`}
                state={{ seller: other.name, sellerId: other.id, productName: '', productImage: '', productPrice: 0 }}
                key={room.id}
                className="card p-4 flex items-center gap-3 block"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 border border-gray-200 overflow-hidden">
                  {other.profileImage ? <img src={imageUrl(other.profileImage)} alt="" className="w-full h-full object-cover" /> : <UserIcon size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-gray-900 truncate">{other.name}</div>
                    {room.status === 'pending' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${room.requestedBy === user.id ? 'bg-gray-100 text-gray-500' : 'bg-sky-100 text-sky-700'}`}>
                        {room.requestedBy === user.id ? '수락 대기' : '채팅 요청'}
                      </span>
                    )}
                    {room.unreadCount > 0 && (
                      <span className="bg-coral text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {lastMsg ? renderPreview(lastMsg) : t('myChatList.startChat')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-gray-500">
                    {lastMsg ? formatTime(lastMsg.createdAt) : ''}
                  </span>
                  <button
                    onClick={(e) => handleDelete(room.id, other.name, e)}
                    aria-label="대화 삭제"
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-coral hover:bg-coral/10 rounded transition-colors"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyChatList;
