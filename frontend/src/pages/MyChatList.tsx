import { Link } from 'react-router-dom';

const MyChatList = () => {
  const chats = JSON.parse(localStorage.getItem('myChats') || '[]');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">채팅 목록</h1>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">채팅 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat: { id: string; productId: string; name: string; lastMessage: string; time: string }) => (
            <Link to={`/chat/${chat.productId}`} key={chat.id} className="card p-4 flex items-center gap-3 block">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">💬</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{chat.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{chat.lastMessage}</div>
              </div>
              <div className="text-[11px] text-gray-300 flex-shrink-0">{chat.time}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyChatList;
