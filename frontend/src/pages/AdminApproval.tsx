import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface PendingItem {
  id: string;
  name: string;
  price: number;
  duration?: string;
  equipment?: string;
  level?: string;
  maxStudents?: number;
  image: string;
  resort: {
    name: string;
    location: string;
  };
  user: {
    name: string;
    phone: string;
    email: string;
  };
  createdAt: string;
}

const AdminApproval = () => {
  const [activeTab, setActiveTab] = useState<'rental' | 'lesson'>('rental');
  const [statusTab, setStatusTab] = useState<'pending' | 'approved'>('pending');
  const [pendingRentals, setPendingRentals] = useState<PendingItem[]>([]);
  const [pendingLessons, setPendingLessons] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const [rentalsRes, lessonsRes] = await Promise.all([
        fetch('http://localhost:3000/api/admin/rentals/pending', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/admin/lessons/pending', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (rentalsRes.ok) {
        const rentals = await rentalsRes.json();
        setPendingRentals(rentals);
      }

      if (lessonsRes.ok) {
        const lessons = await lessonsRes.json();
        setPendingLessons(lessons);
      }
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const handleApprove = async (id: string, type: 'rental' | 'lesson') => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'rental'
        ? `http://localhost:3000/api/admin/rentals/${id}/approve`
        : `http://localhost:3000/api/admin/lessons/${id}/approve`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('승인되었습니다!');
        fetchPendingItems();
      } else {
        alert('승인 실패');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (id: string, type: 'rental' | 'lesson') => {
    if (!confirm('정말 거부하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'rental'
        ? `http://localhost:3000/api/admin/rentals/${id}/reject`
        : `http://localhost:3000/api/admin/lessons/${id}/reject`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('거부되었습니다.');
        fetchPendingItems();
      } else {
        alert('거부 실패');
      }
    } catch (error) {
      console.error('Reject error:', error);
      alert('거부 중 오류가 발생했습니다.');
    }
  };

  const currentItems = activeTab === 'rental' ? pendingRentals : pendingLessons;

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-gray-400 hover:text-gray-900 text-2xl transition-colors">←</Link>
          <h1 className="text-2xl font-black text-gray-900">관리자 승인</h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('rental')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all ${
              activeTab === 'rental'
                ? 'text-accent-light border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            렌탈 ({pendingRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('lesson')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all ${
              activeTab === 'lesson'
                ? 'text-accent-light border-b-2 border-accent'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            레슨 ({pendingLessons.length})
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="px-4 pt-5">
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setStatusTab('pending')}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              statusTab === 'pending'
                ? 'bg-accent text-white'
                : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            승인 대기
          </button>
          <button
            onClick={() => setStatusTab('approved')}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
              statusTab === 'approved'
                ? 'bg-accent text-white'
                : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            승인 완료
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="px-4">
        {loading ? (
          <div className="text-center py-16 card rounded-2xl">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <span className="text-gray-400 text-sm">로딩 중...</span>
          </div>
        ) : statusTab === 'pending' ? (
          currentItems.length === 0 ? (
            <div className="text-center py-16 card rounded-2xl text-gray-400 text-sm">
              승인 대기 중인 항목이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="card rounded-2xl p-5"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
                      {item.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 mb-1">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-400 mb-1">
                        {item.resort.name} · {item.resort.location}
                      </div>
                      <div className="text-xs text-gray-500">
                        등록자: {item.user.name} ({item.user.phone})
                      </div>
                      {activeTab === 'rental' ? (
                        <div className="text-xs text-gray-400 mt-1">
                          {item.duration} · {item.equipment}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">
                          {item.duration} · {item.level} · 최대 {item.maxStudents}명
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-gray-900">
                        {(item.price / 10000).toFixed(0)}만원
                      </div>
                      <div className="text-xs text-gold font-bold mt-1">
                        승인 대기
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => handleReject(item.id, activeTab)}
                      className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-lg font-bold text-sm hover:bg-zinc-700 hover:text-white border border-zinc-800 transition-all active:scale-95"
                    >
                      거부
                    </button>
                    <button
                      onClick={() => handleApprove(item.id, activeTab)}
                      className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-all active:scale-95"
                    >
                      승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16 card rounded-2xl text-zinc-500 text-sm">
            승인 완료된 항목은 각 카테고리 페이지에서 확인하세요.
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#09090b]/90 backdrop-blur-md border-t border-zinc-800 px-4 py-3 flex justify-around z-50">
        {[
          { to: '/', icon: '🏠', label: '홈', active: false },
          { to: '/new-equipment', icon: '🎿', label: '장비', active: false },
          { to: '/rental', icon: '🏔️', label: '렌탈', active: false },
          { to: '/admin-approval', icon: '⚙️', label: '관리', active: true },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className={`text-xs font-medium ${item.active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminApproval;
