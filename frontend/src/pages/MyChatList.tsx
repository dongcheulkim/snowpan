import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';

interface ChatRoom {
  id: string;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
}

const MyChatList = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!user) return;
    api<ChatRoom[]>('/chat/rooms')
      .then(setRooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <p className="text-gray-400 mb-4">로그인이 필요합니다.</p>
        <Link to="/login" className="text-primary-dark hover:underline text-sm">로그인하기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">채팅</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩 중...</div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">채팅 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => {
            const other = room.user1.id === user.id ? room.user2 : room.user1;
            const lastMsg = room.messages[0];
            return (
              <Link
                to={`/chat/${room.id}`}
                state={{ seller: other.name, sellerId: other.id, productName: '', productImage: '💬', productPrice: 0 }}
                key={room.id}
                className="card p-4 flex items-center gap-3 block"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl border border-gray-200">👤</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{other.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {lastMsg ? lastMsg.content : '대화를 시작해보세요'}
                  </div>
                </div>
                <div className="text-[11px] text-gray-300 flex-shrink-0">
                  {lastMsg ? formatTime(lastMsg.createdAt) : ''}
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
