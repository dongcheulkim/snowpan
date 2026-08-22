import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

// 토스 결제 콜백 — successUrl 이면 서버 승인(confirm), failUrl 이면 실패 안내.
export default function AgencyPayResult({ mode }: { mode: 'success' | 'fail' }) {
  const [params] = useSearchParams();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(mode === 'success' ? 'loading' : 'error');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (mode === 'fail') {
      setMsg(params.get('message') || '결제가 취소되었거나 실패했어요.');
      return;
    }
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = params.get('amount');
    if (!paymentKey || !orderId || !amount) { setState('error'); setMsg('결제 정보가 올바르지 않아요.'); return; }
    api<{ ok: boolean }>('/agencies/subscriptions/confirm', {
      method: 'POST',
      body: { paymentKey, orderId, amount: Number(amount) },
    })
      .then(() => setState('ok'))
      .catch((e) => { setState('error'); setMsg(e instanceof Error ? e.message : '결제 확정에 실패했어요.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      {state === 'loading' && <p className="text-sm text-gray-600">결제를 확인하고 있어요...</p>}
      {state === 'ok' && (
        <>
          <div className="w-14 h-14 rounded-full bg-mint/20 flex items-center justify-center text-mint text-2xl font-black">✓</div>
          <div>
            <p className="text-base font-bold text-gray-900">구독이 완료됐어요!</p>
            <p className="text-xs text-gray-500 mt-1">이제 여행 상품을 등록하고 추천 여행사로 노출됩니다.</p>
          </div>
          <Link to="/overseas/agency/manage" className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold">여행사 관리로</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <p className="text-base font-bold text-gray-900">결제를 완료하지 못했어요</p>
          <p className="text-xs text-gray-500">{msg}</p>
          <Link to="/overseas/agency/manage" className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold">다시 시도</Link>
        </>
      )}
    </div>
  );
}
