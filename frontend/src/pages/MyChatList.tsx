import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { t, onLangChange } from '../i18n';
import EmptyState from '../components/EmptyState';
import { ListRowSkeleton } from '../components/Skeleton';
import { ChatIcon, CloseIcon, UserIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../components/Toast';

interface ChatRoom {
  id: string;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
  messages: { content: string; createdAt: string; type?: string }[];
  unreadCount: number;
  updatedAt: string;
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
  return msg.content;
};

const MyChatList = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<ChatRoom[] | { items: ChatRoom[] }>('/chat/rooms')
      .then((data) => {
        // 배열 또는 {items: []} 둘 다 대응
        const list = Array.isArray(data) ? data : (data as { items?: ChatRoom[] })?.items || [];
        setRooms(list);
      })
      .catch((err) => {
        console.error('채팅방 목록 로드 실패:', err?.message || err);
        setRooms([]);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (roomId: string, otherName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`${otherName}님과의 대화를 삭제하시겠습니까?\n상대방도 대화 내용을 볼 수 없게 됩니다.`)) return;
    // optimistic update
    const prev = rooms;
    setRooms(rooms.filter(r => r.id !== roomId));
    try {
      await api(`/chat/rooms/${roomId}`, { method: 'DELETE' });
      toastSuccess('대화방이 삭제되었습니다');
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
        <p className="text-gray-400 mb-4">{t('chat.loginRequired')}</p>
        <Link to="/login" className="text-primary-dark hover:underline text-sm">{t('chat.loginLink')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">&larr;</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('myChatList.title')}</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </div>
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
          {rooms.filter(r => r && r.user1 && r.user2).map((room) => {
            const other = room.user1.id === user.id ? room.user2 : room.user1;
            const lastMsg = (room.messages && room.messages[0]) || null;
            return (
              <Link
                to={`/chat/${room.id}`}
                state={{ seller: other.name, sellerId: other.id, productName: '', productImage: '', productPrice: 0 }}
                key={room.id}
                className="card p-4 flex items-center gap-3 block"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200">
                  <UserIcon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-gray-900 truncate">{other.name}</div>
                    {room.unreadCount > 0 && (
                      <span className="bg-coral text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {lastMsg ? renderPreview(lastMsg) : t('myChatList.startChat')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[11px] text-gray-300">
                    {lastMsg ? formatTime(lastMsg.createdAt) : ''}
                  </span>
                  <button
                    onClick={(e) => handleDelete(room.id, other.name, e)}
                    aria-label="대화 삭제"
                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-coral hover:bg-coral/10 rounded transition-colors"
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
