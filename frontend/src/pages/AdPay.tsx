import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { toastError } from '../components/Toast';

// 광고 카드 결제 — 토스페이먼츠 결제창(v1 SDK).
// 클라이언트 키: 운영은 VITE_TOSS_CLIENT_KEY, 미설정 시 문서용 테스트 키(실청구 없음).
const TOSS_CLIENT_KEY = (import.meta.env.VITE_TOSS_CLIENT_KEY as string) || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
const SDK_SRC = 'https://js.tosspayments.com/v1/payment';

interface PayInfo {
  id: string;
  title: string | null;
  slotType: string;
  totalPrice: number;
  status: string;
  merchantUid: string | null;
}

interface TossPaymentsSdk {
  requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void>;
}

function loadTossSdk(): Promise<(key: string) => TossPaymentsSdk> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { TossPayments?: (key: string) => TossPaymentsSdk };
    if (w.TossPayments) { resolve(w.TossPayments); return; }
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.onload = () => {
      if (w.TossPayments) resolve(w.TossPayments);
      else reject(new Error('결제 모듈을 불러오지 못했습니다.'));
    };
    script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

const SLOT_LABELS: Record<string, string> = { main_banner: '메인 배너', category: '카테고리 배너', premium: '프리미엄 노출' };

export default function AdPay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    document.title = '광고 결제 - 스노우판';
    if (!id) return;
    api<PayInfo>(`/ad-booking/${id}/pay-info`)
      .then(setInfo)
      .catch((e) => toastError(e instanceof Error ? e.message : '조회에 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePay = async () => {
    if (!info || !info.merchantUid) return;
    setPaying(true);
    try {
      const TossPayments = await loadTossSdk();
      const toss = TossPayments(TOSS_CLIENT_KEY);
      await toss.requestPayment('카드', {
        amount: info.totalPrice,
        orderId: info.merchantUid,
        orderName: `스노우판 광고 — ${SLOT_LABELS[info.slotType] || info.slotType} 12개월`,
        successUrl: `${window.location.origin}/ad-booking/pay/success?bookingId=${info.id}`,
        failUrl: `${window.location.origin}/ad-booking/pay/fail?bookingId=${info.id}`,
      });
    } catch (e) {
      // 사용자가 결제창을 닫은 경우도 여기로 옴 — 조용히 복구
      const msg = e instanceof Error ? e.message : '';
      if (msg && !/취소/.test(msg)) toastError(msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="max-w-md mx-auto py-20 text-center text-sm text-gray-400">불러오는 중...</div>;
  if (!info) return <div className="max-w-md mx-auto py-20 text-center text-sm text-gray-500">결제할 예약을 찾을 수 없어요.</div>;

  if (info.status !== 'pending_payment') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <p className="text-sm text-gray-600">이미 결제되었거나 결제 대기 상태가 아닌 예약이에요.</p>
        <button onClick={() => navigate('/mypage/ads')} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold">광고 관리로 가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-900">광고 결제</h1>

      <div className="card p-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">상품</span>
          <span className="font-medium text-gray-900">{SLOT_LABELS[info.slotType] || info.slotType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">광고명</span>
          <span className="font-medium text-gray-900 truncate max-w-[200px]">{info.title || '(이미지 광고)'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">계약 기간</span>
          <span className="font-medium text-gray-900">12개월</span>
        </div>
        <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
          <span className="text-gray-500">결제 금액</span>
          <span className="text-lg font-bold text-sky-600">{info.totalPrice.toLocaleString()}원</span>
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={paying}
        className="w-full py-3.5 bg-sky-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
      >
        {paying ? '결제창 여는 중...' : '카드로 결제하기'}
      </button>

      {TOSS_CLIENT_KEY.startsWith('test_') && (
        <p className="text-[11px] text-gray-400 text-center">테스트 결제 환경입니다. 실제 청구되지 않습니다.</p>
      )}
      <p className="text-[11px] text-gray-500 text-center leading-relaxed">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.<br />
        게시 시작 전 취소 시 전액 환불, 게시 중 취소 시 잔여 기간 기준 일할 환불됩니다.
      </p>
    </div>
  );
}
