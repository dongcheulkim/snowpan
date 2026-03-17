import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../api';

interface Notification {
  id: string;
  type: 'chat' | 'approve' | 'system' | 'badge';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

const Notifications = () => {
  const user = getUser();
  // 추후 API 연동 시 교체
  const [notifications] = useState<Notification[]>([]);

  const typeIcons: Record<string, string> = {
    chat: '💬',
    approve: '✅',
    system: '📢',
    badge: '🏅',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">알림</h1>
        </div>
        <Link to="/mypage/notifications" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          설정
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-sm text-gray-400">아직 알림이 없습니다.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {notifications.map((noti, idx) => (
            <Link
              key={noti.id}
              to={noti.link || '#'}
              className={`flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                idx < notifications.length - 1 ? 'border-b border-gray-100' : ''
              } ${!noti.read ? 'bg-sky-50/50' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                {typeIcons[noti.type] || '📢'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate">{noti.title}</span>
                  {!noti.read && <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{noti.message}</p>
                <span className="text-[10px] text-gray-300 mt-1 block">{noti.time}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
