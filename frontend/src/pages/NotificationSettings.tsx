import { useState } from 'react';
import { Link } from 'react-router-dom';

function readStored(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('notificationSettings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {}; // 손상된 값이면 기본값으로 (크래시 방지)
  }
}

const NotificationSettings = () => {
  const stored = readStored();
  const [settings, setSettings] = useState({
    chat: stored.chat ?? true,
    community: stored.community ?? true,
    deal: stored.deal ?? true,
    marketing: stored.marketing ?? false,
  });

  const toggle = (key: keyof typeof settings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
  };

  const items = [
    { key: 'chat' as const, label: '채팅 알림', desc: '새 메시지가 오면 알림' },
    { key: 'community' as const, label: '커뮤니티 알림', desc: '내 글에 댓글이 달리면 알림' },
    { key: 'deal' as const, label: '거래 알림', desc: '찜한 상품 가격 변동 알림' },
    { key: 'marketing' as const, label: '마케팅 알림', desc: '이벤트, 할인 정보 알림' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">알림 설정</h1>
      </div>

      <div className="card overflow-hidden">
        {items.map((item, idx) => (
          <div key={item.key} className={`flex items-center justify-between px-5 py-4 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div>
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
            </div>
            <button onClick={() => toggle(item.key)} className={`w-11 h-6 rounded-full transition-colors relative ${settings[item.key] ? 'bg-primary' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-snow rounded-full shadow absolute top-0.5 transition-transform ${settings[item.key] ? 'translate-x-5.5 right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
