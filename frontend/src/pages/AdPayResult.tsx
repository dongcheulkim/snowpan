import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api';

// 토스 결제 리다이렉트 수신 — /ad-booking/pay/success 와 /ad-booking/pay/fail 공용.
// success: paymentKey/orderId/amount 를 백엔드 승인 API 로 전달해 결제 확정.
export default function AdPayResult() {
  const [params] = useSearchParams();
  const location = useLocation();
  const isSuccessPath = location.pathname.endsWith('/success');
  const [state, setState] = useState<'confirming' | 'done' | 'error'>('confirming');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    document.title = '광고 결제 - 스노우판';
    if (ran.current) return;
    ran.current = true;

    if (!isSuccessPath) {
      setState('error');
      setMessage(params.get('message') || '결제가 취소되었거나 실패했습니다.');
      return;
    }
    const bookingId = params.get('bookingId');
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = params.get('amount');
    if (!bookingId || !paymentKey || !orderId || !amount) {
      setState('error');
      setMessage('결제 정보가 누락되었습니다. 광고 관리에서 다시 시도해주세요.');
      return;
    }
    api(`/ad-booking/${bookingId}/confirm-payment`, {
      method: 'POST',
      body: { paymentKey, orderId, amount: Number(amount) },
    })
      .then(() => setState('done'))
      .catch((e) => {
        setState('error');
        setMessage(e instanceof Error ? e.message : '결제 승인에 실패했습니다.');
      });
  }, [isSuccessPath, params]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4 animate-fade-in">
      {state === 'confirming' ? (
        <>
          <p className="text-lg font-bold text-gray-900">결제 확인 중...</p>
          <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
        </>
      ) : state === 'done' ? (
        <>
          <div className="w-14 h-14 mx-auto rounded-full bg-sky-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <p className="text-lg font-bold text-gray-900">결제가 완료되었습니다</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            운영자 검수 후 광고가 게재됩니다.<br />진행 상황은 광고 관리에서 확인할 수 있어요.
          </p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
          <p className="text-lg font-bold text-gray-900">결제가 완료되지 않았어요</p>
          <p className="text-sm text-gray-500">{message}</p>
        </>
      )}
      {state !== 'confirming' && (
        <Link to="/mypage/ads" className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold">광고 관리로 가기</Link>
      )}
    </div>
  );
}
