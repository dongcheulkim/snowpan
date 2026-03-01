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

  // 승인 대기 목록 조회
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

  // 승인 처리
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
        fetchPendingItems(); // 목록 새로고침
      } else {
        alert('승인 실패');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  // 거부 처리
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
        fetchPendingItems(); // 목록 새로고침
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
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-500 px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-white text-2xl">←</Link>
          <h1 className="text-2xl font-black text-white">관리자 승인</h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('rental')}
            className={`flex-1 py-4 text-center font-bold transition-colors ${
              activeTab === 'rental'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            렌탈 ({pendingRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('lesson')}
            className={`flex-1 py-4 text-center font-bold transition-colors ${
              activeTab === 'lesson'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            레슨 ({pendingLessons.length})
          </button>
        </div>
      </div>

      {/* 상태 탭 */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setStatusTab('pending')}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${
              statusTab === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            승인 대기
          </button>
          <button
            onClick={() => setStatusTab('approved')}
            className={`px-6 py-2 rounded-full font-bold transition-colors ${
              statusTab === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            승인 완료
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="px-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : statusTab === 'pending' ? (
          currentItems.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              승인 대기 중인 항목이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-md"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-4xl">{item.image}</div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 mb-1">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        {item.resort.name} · {item.resort.location}
                      </div>
                      <div className="text-sm text-gray-600">
                        등록자: {item.user.name} ({item.user.phone})
                      </div>
                      {activeTab === 'rental' ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.duration} · {item.equipment}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.duration} · {item.level} · 최대 {item.maxStudents}명
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-blue-600">
                        {(item.price / 10000).toFixed(0)}만원
                      </div>
                      <div className="text-xs text-orange-600 font-bold mt-1">
                        승인 대기
                      </div>
                    </div>
                  </div>

                  {/* 승인/거부 버튼 */}
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleReject(item.id, activeTab)}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold active:bg-gray-300"
                    >
                      거부
                    </button>
                    <button
                      onClick={() => handleApprove(item.id, activeTab)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold active:bg-blue-700"
                    >
                      승인
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-10 text-gray-500">
            승인 완료된 항목은 각 카테고리 페이지에서 확인하세요.
          </div>
        )}
      </div>

      {/* 하단 고정 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
        <Link to="/" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏠</span>
          <span className="text-xs text-gray-500">홈</span>
        </Link>
        <Link to="/new-equipment" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🎿</span>
          <span className="text-xs text-gray-500">장비</span>
        </Link>
        <Link to="/rental" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏔️</span>
          <span className="text-xs text-gray-500">렌탈</span>
        </Link>
        <Link to="/admin-approval" className="flex flex-col items-center gap-1">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs font-medium text-blue-600">관리</span>
        </Link>
      </div>
    </div>
  );
};

export default AdminApproval;
