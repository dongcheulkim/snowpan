// 토스페이먼츠 결제 승인 — 스노우판 전 결제 공용.
// successUrl 로 돌아온 paymentKey/orderId/amount 를 서버에서 확정(confirm).
// TOSS_SECRET_KEY (Render env) 필요. 토스 심사 완료 후 키 넣으면 활성화.
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, error: '결제 설정이 완료되지 않았습니다. (TOSS_SECRET_KEY)' };
  try {
    const resp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const data = (await resp.json()) as { status?: string; message?: string };
    if (!resp.ok || (data.status && data.status !== 'DONE')) {
      return { ok: false, error: data.message || '결제 승인에 실패했습니다.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: '결제 승인 중 오류가 발생했습니다.' };
  }
}

// 토스 결제 사용 가능 여부 (심사/키 준비 완료 시 true). 프론트에 노출 판단용.
export const TOSS_ENABLED = !!process.env.TOSS_SECRET_KEY;
