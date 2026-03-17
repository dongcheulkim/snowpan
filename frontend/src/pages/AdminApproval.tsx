import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface PendingItem {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  duration?: string;
  equipment?: string;
  level?: string;
  maxStudents?: number;
  type?: string;
  guests?: string;
  features?: string;
  badgeType?: string;
  status?: string;
  resort?: { name: string };
  user?: { id: string; name: string };
}

type TabId = 'rental' | 'lesson' | 'accommodation' | 'badge';

const badgeLabels: Record<string, { label: string; color: string }> = {
  lv2: { label: 'LV2', color: 'bg-accent text-white' },
  lv3: { label: 'LV3', color: 'bg-purple-500 text-white' },
  demo: { label: '데몬', color: 'bg-yellow-500 text-black' },
  teaching: { label: '티칭', color: 'bg-blue-500 text-white' },
  pro: { label: '프로', color: 'bg-red-500 text-white' },
};

const accomTypeLabels: Record<string, string> = {
  hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방',
};

const AdminApproval = () => {
  const [activeTab, setActiveTab] = useState<TabId>('rental');
  const [pendingRentals, setPendingRentals] = useState<PendingItem[]>([]);
  const [pendingLessons, setPendingLessons] = useState<PendingItem[]>([]);
  const [pendingAccom, setPendingAccom] = useState<PendingItem[]>([]);
  const [pendingBadges, setPendingBadges] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [rentals, lessons, accom, badges] = await Promise.all([
        api<PendingItem[]>('/admin/rentals/pending'),
        api<PendingItem[]>('/admin/lessons/pending'),
        api<PendingItem[]>('/admin/accommodations/pending'),
        api<PendingItem[]>('/admin/badges/pending'),
      ]);
      setPendingRentals(rentals);
      setPendingLessons(lessons);
      setPendingAccom(accom);
      setPendingBadges(badges);
    } catch {
      // not admin or error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (tab: TabId, id: string) => {
    const path = tab === 'badge' ? 'badges' : `${tab}s`;
    try {
      await api(`/admin/${path}/${id}/approve`, { method: 'PUT' });
      alert('승인되었습니다!');
      fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인 실패');
    }
  };

  const handleReject = async (tab: TabId, id: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return;
    const path = tab === 'badge' ? 'badges' : `${tab}s`;
    try {
      await api(`/admin/${path}/${id}/reject`, { method: 'DELETE' });
      alert('거부되었습니다.');
      fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : '거부 실패');
    }
  };

  const tabs = [
    { id: 'rental' as const, name: '렌탈', count: pendingRentals.length },
    { id: 'lesson' as const, name: '레슨', count: pendingLessons.length },
    { id: 'accommodation' as const, name: '숙소', count: pendingAccom.length },
    { id: 'badge' as const, name: '자격증', count: pendingBadges.length },
  ];

  const displayItems =
    activeTab === 'rental' ? pendingRentals :
    activeTab === 'lesson' ? pendingLessons :
    activeTab === 'accommodation' ? pendingAccom :
    pendingBadges;

  const renderItem = (item: PendingItem) => {
    if (activeTab === 'badge') {
      const badge = badgeLabels[item.badgeType || ''];
      return (
        <div key={item.id} className="card p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>}
                <span className="font-bold text-sm text-gray-900">{badge?.label || item.badgeType} 자격증 인증 요청</span>
              </div>
              {item.user && <div className="text-xs text-gray-400">신청자: {item.user.name}</div>}
              {item.image && (
                <div className="mt-2">
                  <img src={item.image.startsWith('/') ? `http://localhost:3000${item.image}` : item.image} alt="자격증" className="w-32 h-24 object-cover rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-50">
            <button onClick={() => handleReject('badge', item.id)} className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg font-bold text-xs active:bg-gray-100 transition-colors">거부</button>
            <button onClick={() => handleApprove('badge', item.id)} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors">승인</button>
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="card p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
            {item.image && (item.image.startsWith('/') || item.image.startsWith('http'))
              ? <img src={item.image.startsWith('/') ? `http://localhost:3000${item.image}` : item.image} alt="" className="w-full h-full object-cover rounded-xl" />
              : item.image || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.resort?.name}</div>
            {activeTab === 'rental' && item.equipment && (
              <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.equipment}</div>
            )}
            {activeTab === 'lesson' && (
              <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.level} · 최대 {item.maxStudents}명</div>
            )}
            {activeTab === 'accommodation' && (
              <div className="text-xs text-gray-400 mt-0.5">{(item.type || '').split(',').map(t => accomTypeLabels[t] || t).join(', ')} · {item.guests}</div>
            )}
            {item.user && <div className="text-xs text-gray-300 mt-0.5">등록자: {item.user.name}</div>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-base font-black text-gray-900">{item.price?.toLocaleString()}원</div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <button onClick={() => handleReject(activeTab, item.id)} className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg font-bold text-xs active:bg-gray-100 transition-colors">거부</button>
          <button onClick={() => handleApprove(activeTab, item.id)} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors">승인</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 승인</h1>
        <Link to="/mypage" className="text-sm text-gray-400">← 내정보</Link>
      </div>

      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {tab.name} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩 중...</div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">
          승인 대기 중인 항목이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map(renderItem)}
        </div>
      )}
    </div>
  );
};

export default AdminApproval;
