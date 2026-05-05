import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CloseIcon, MegaphoneIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';

interface AdBooking {
  id: string;
  slotType: string;
  category: string | null;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
}

const statusLabel: Record<string, string> = {
  pending_payment: '결제 대기', paid: '결제 완료', active: '노출중',
  completed: '종료', cancelled: '취소됨', refunded: '환불됨',
};
const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700', paid: 'bg-blue-100 text-blue-700',
  active: 'bg-mint/20 text-emerald-700', completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-coral/20 text-coral', refunded: 'bg-coral/20 text-coral',
};

export default function MyAds() {
  const [ads, setAds] = useState<AdBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAds = () => {
    api<AdBooking[]>('/ad-booking/my-bookings')
      .then(d => setAds(Array.isArray(d) ? d : []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAds(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 광고 내역을 삭제하시겠습니까?')) return;
    try {
      await api(`/ad-booking/${id}`, { method: 'DELETE' });
      setAds(prev => prev.filter(a => a.id !== id));
      loadAds();
    } catch { alert('삭제에 실패했습니다.'); }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">광고 관리</h1>
        </div>
        <Link to="/ad-booking" className="px-3 py-1.5 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent-light transition-colors">
          + 광고 신청
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : ads.length === 0 ? (
        <EmptyState
          icon={<MegaphoneIcon size={48} strokeWidth={1.4} />}
          title="아직 신청한 광고가 없어요"
          description={"메인 배너·카테고리 광고로 더 많은 노출을\n받아보세요. 베타 기간 무료 노출 기회도 있어요."}
          ctaLabel="광고 신청하기"
          ctaTo="/ad-booking"
        />
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => {
            const slotLabel = ad.slotType === 'main_banner' ? '메인 배너' : ad.slotType === 'premium' ? '프리미엄' : '카테고리';
            const startD = new Date(ad.startDate);
            const endD = new Date(ad.endDate);
            const dateRange = `${startD.getMonth() + 1}.${startD.getDate()} ~ ${endD.getMonth() + 1}.${endD.getDate()}`;
            return (
              <div key={ad.id} className="card p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[ad.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[ad.status] || ad.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{slotLabel}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{ad.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{dateRange} ({ad.totalDays}일) · {ad.totalPrice.toLocaleString()}원</p>
                </div>
                {!['active', 'paid', 'pending_payment'].includes(ad.status) && (
                  <button onClick={() => handleDelete(ad.id)} aria-label="삭제" className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"><CloseIcon size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
