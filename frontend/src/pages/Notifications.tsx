import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

const Notifications = () => {
  const user = getUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const typeIcons: Record<string, string> = {
    chat: '💬',
    approve: '✅',
    reject: '❌',
    system: '📢',
    badge: '🏅',
  };

  useEffect(() => {
    if (!user) return;
    api<Notification[]>('/notifications')
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const handleClick = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 알림을 삭제하시겠습니까?')) return;
    try {
      await api('/notifications/all', { method: 'DELETE' });
      setNotifications([]);
    } catch { /* ignore */ }
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              모두 읽음
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleDeleteAll} className="text-xs text-red-400 hover:text-red-500 transition-colors">
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩 중...</div>
      ) : notifications.length === 0 ? (
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
              onClick={() => handleClick(noti.id)}
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
                <span className="text-[10px] text-gray-300 mt-1 block">{formatTime(noti.createdAt)}</span>
              </div>
              <button
                onClick={(e) => handleDelete(noti.id, e)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
              >
                ✕
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
