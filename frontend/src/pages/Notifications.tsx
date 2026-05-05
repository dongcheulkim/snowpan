import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { t, onLangChange } from '../i18n';
import { BellIcon, ChatIcon, CheckIcon, CloseIcon, MegaphoneIcon, TrophyIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';

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
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const renderTypeIcon = (type: string) => {
    const cls = 'text-gray-700';
    switch (type) {
      case 'chat': return <ChatIcon size={20} className={cls} />;
      case 'approve': return <CheckIcon size={20} className="text-emerald-600" />;
      case 'reject': return <CloseIcon size={20} className="text-red-600" />;
      case 'badge': return <TrophyIcon size={20} className={cls} />;
      default: return <MegaphoneIcon size={20} className={cls} />;
    }
  };

  useEffect(() => {
    if (!user) return;
    api<any>('/notifications')
      .then(data => {
        const notifs = Array.isArray(data) ? data : (data?.notifications || []);
        setNotifications(notifs);
      })
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
    if (!confirm(t('notifications.confirmDeleteAll'))) return;
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
        <p className="text-gray-500 mb-4">{t('notifications.loginRequired')}</p>
        <Link to="/login" className="text-primary-dark hover:underline text-sm">{t('chat.loginLink')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">{t('notifications.title')}</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-gray-500 hover:text-gray-600 transition-colors">
              {t('notifications.markAllRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleDeleteAll} className="text-xs text-red-400 hover:text-red-500 transition-colors">
              {t('notifications.deleteAll')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">{t('general.loading')}</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={48} strokeWidth={1.4} />}
          title={t('notifications.empty')}
          description={"새 메시지·승인·관심글 댓글 등\n중요한 소식이 여기에 표시됩니다."}
        />
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
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                {renderTypeIcon(noti.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 truncate">{noti.title}</span>
                  {!noti.read && <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{noti.message}</p>
                <span className="text-[10px] text-gray-500 mt-1 block">{formatTime(noti.createdAt)}</span>
              </div>
              <button
                onClick={(e) => handleDelete(noti.id, e)}
                aria-label="삭제"
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
              >
                <CloseIcon size={16} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
