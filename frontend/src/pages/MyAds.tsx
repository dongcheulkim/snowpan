import { toastError, toastSuccess } from '../utils/toast';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { adSlotLabelKr } from '../utils/adLabels';
import { tossConfigured } from '../toss';
import { CloseIcon, MegaphoneIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import LoadError from '../components/LoadError';

interface AdBooking {
  id: string;
  slotType: string;
  category: string | null;
  title: string;
  description?: string | null;
  url?: string | null;
  image?: string | null;
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
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 메시지 (빈 상태와 구분)

  // 실패 메시지는 성공 시 지우고 실패 시 기록 (마운트 이펙트에서 동기 setState 를 피하려 시작 시점엔 건드리지 않음)
  const loadAds = () => {
    api<AdBooking[]>('/ad-booking/my-bookings')
      .then(d => { setAds(Array.isArray(d) ? d : []); setLoadError(null); })
      .catch((err) => { setAds([]); setLoadError(err instanceof Error ? err.message : '광고 내역을 불러오지 못했어요.'); })
      .finally(() => setLoading(false));
  };

   
  useEffect(() => { loadAds(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 광고 내역을 삭제하시겠습니까?')) return;
    try {
      await api(`/ad-booking/${id}`, { method: 'DELETE' });
      setAds(prev => prev.filter(a => a.id !== id));
      loadAds();
    } catch { toastError('삭제에 실패했습니다.'); }
  };

  // 광고 소재 수정은 신청 화면(/ad-booking/edit/:id)에서 — 미리보기·드래그·확대·글자색까지 그대로 (사용자 요청 2026-09-09). 기간·가격은 수정 불가.

  // 입금 전(pending_payment)·게시 전(paid)·게시 중(active) 취소 — 백엔드 취소/환불 로직은
  // 이미 있었는데 UI 진입점이 없어 사용자가 취소할 방법이 없었음.
  const handleCancel = async (ad: AdBooking) => {
    const msg = ad.status === 'pending_payment'
      ? '이 예약을 취소하시겠습니까?'
      : ad.status === 'active'
        ? '게시 중인 광고를 취소하면 남은 기간만큼 환불됩니다. 취소하시겠습니까?'
        : '결제된 광고를 취소하면 전액 환불 처리됩니다. 취소하시겠습니까?';
    if (!confirm(msg)) return;
    try {
      await api(`/ad-booking/${ad.id}/cancel`, { method: 'POST' });
      toastSuccess('취소되었습니다.');
      loadAds();
    } catch (e) { toastError(e instanceof Error ? e.message : '취소에 실패했습니다.'); }
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
      ) : loadError && ads.length === 0 ? (
        <LoadError message={loadError} onRetry={() => { setLoading(true); setLoadError(null); loadAds(); }} />
      ) : ads.length === 0 ? (
        <EmptyState
          icon={<MegaphoneIcon size={48} strokeWidth={1.4} />}
          title="아직 신청한 광고가 없어요"
          description={"메인 배너·카테고리 광고로 더 많은 노출을\n받아보세요. 고객센터 채팅으로 상담해 드려요."}
          ctaLabel="광고 신청하기"
          ctaTo="/ad-booking"
        />
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => {
            // 어떤 지면·어떤 카테고리 광고인지 명시 — 예: "카테고리 배너 · 중고거래"
            const slotLabel = adSlotLabelKr(ad.slotType, ad.category);
            const startD = new Date(ad.startDate);
            const endD = new Date(ad.endDate);
            const dateRange = `${startD.getMonth() + 1}.${startD.getDate()} ~ ${endD.getMonth() + 1}.${endD.getDate()}`;
            return (
              <div key={ad.id} className="card p-4 flex items-start justify-between gap-3">
                {ad.image && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <img src={imageUrl(ad.image, 200)} alt="광고 소재" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[ad.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[ad.status] || ad.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{slotLabel}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{ad.title || '(이미지 광고)'}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{dateRange} ({ad.totalDays}일) · {ad.totalPrice.toLocaleString()}원</p>
                </div>
                {['active', 'paid', 'pending_payment'].includes(ad.status) ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* 카드 결제는 PG 가 연결된 경우에만 (지금은 계좌이체 상담형 — 테스트 결제 화면이 앱에 노출되지 않게, 애플 2.2) */}
                    {ad.status === 'pending_payment' && tossConfigured() && (
                      <Link to={`/ad-booking/pay/${ad.id}`} className="text-[11px] font-bold text-white bg-sky-500 rounded-lg px-2.5 py-1.5 transition-colors">카드 결제</Link>
                    )}
                    <Link to={`/ad-booking/edit/${ad.id}`} className="text-[11px] font-bold text-sky-600 border border-sky-200 rounded-lg px-2.5 py-1.5 transition-colors">수정</Link>
                    {/* 결제 전(pending_payment)만 취소 가능. 결제된 광고는 1년 계약이라 중도 해지 불가 */}
                    {ad.status === 'pending_payment' && (
                      <button onClick={() => handleCancel(ad)} className="text-[11px] font-bold text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">취소</button>
                    )}
                  </div>
                ) : (
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
