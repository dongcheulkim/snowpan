import { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminApproval = () => {
  const [activeTab, setActiveTab] = useState<'rental' | 'lesson' | 'accommodation'>('rental');
  const [statusTab, setStatusTab] = useState<'pending' | 'approved'>('pending');
  const [, setRefresh] = useState(0);

  const allItems = JSON.parse(localStorage.getItem('pendingItems') || '[]');
  const pendingItems = allItems.filter((i: { type: string; status: string }) => i.type === activeTab && i.status === 'pending');
  const approvedItems = allItems.filter((i: { type: string; status: string }) => i.type === activeTab && i.status === 'approved');

  const handleApprove = (id: string) => {
    const items = JSON.parse(localStorage.getItem('pendingItems') || '[]');
    const updated = items.map((i: { id: string }) => i.id === id ? { ...i, status: 'approved' } : i);
    localStorage.setItem('pendingItems', JSON.stringify(updated));
    setRefresh(v => v + 1);
    alert('승인되었습니다!');
  };

  const handleReject = (id: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return;
    const items = JSON.parse(localStorage.getItem('pendingItems') || '[]');
    const updated = items.filter((i: { id: string }) => i.id !== id);
    localStorage.setItem('pendingItems', JSON.stringify(updated));
    setRefresh(v => v + 1);
    alert('거부되었습니다.');
  };

  const tabs = [
    { id: 'rental' as const, name: '렌탈' },
    { id: 'lesson' as const, name: '레슨' },
    { id: 'accommodation' as const, name: '숙소' },
  ];

  const displayItems = statusTab === 'pending' ? pendingItems : approvedItems;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 승인</h1>
        <Link to="/" className="text-sm text-gray-400">홈으로</Link>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {tab.name} ({allItems.filter((i: { type: string; status: string }) => i.type === tab.id && i.status === 'pending').length})
          </button>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusTab('pending')}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            statusTab === 'pending' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'
          }`}
        >
          승인 대기 ({pendingItems.length})
        </button>
        <button
          onClick={() => setStatusTab('approved')}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
            statusTab === 'approved' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'
          }`}
        >
          승인 완료 ({approvedItems.length})
        </button>
      </div>

      {/* Items */}
      {displayItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">
          {statusTab === 'pending' ? '승인 대기 중인 항목이 없습니다.' : '승인 완료된 항목이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item: { id: string; name: string; resort: string; price: number; type: string; image: string; duration?: string; equipment?: string[]; level?: string; maxStudents?: number; typeName?: string }) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.resort}</div>
                  {item.type === 'rental' && item.equipment && (
                    <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.equipment.join(', ')}</div>
                  )}
                  {item.type === 'lesson' && (
                    <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.level} · 최대 {item.maxStudents}명</div>
                  )}
                  {item.type === 'accommodation' && (
                    <div className="text-xs text-gray-400 mt-0.5">{item.typeName}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-black text-gray-900">{item.price.toLocaleString()}원</div>
                </div>
              </div>

              {statusTab === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => handleReject(item.id)}
                    className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg font-bold text-xs active:bg-gray-100 transition-colors"
                  >
                    거부
                  </button>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors"
                  >
                    승인
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApproval;
