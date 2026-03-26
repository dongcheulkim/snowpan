// PortOne V2 API 유틸리티

const PORTONE_API_URL = 'https://api.portone.io';

function getApiSecret(): string {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.');
  return secret;
}

interface PortOnePayment {
  id: string;
  status: string; // 'PAID' | 'CANCELLED' | 'FAILED' | 'READY'
  amount: { total: number; paid: number };
  method?: { type: string };
  channel?: { pgProvider: string; name: string };
  pgTxId?: string;
  orderName?: string;
  customData?: string;
  paidAt?: string;
  receiptUrl?: string;
  merchantId?: string;
}

export async function getPayment(paymentId: string): Promise<PortOnePayment> {
  const res = await fetch(`${PORTONE_API_URL}/payments/${paymentId}`, {
    headers: { Authorization: `PortOne ${getApiSecret()}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PortOne 결제 조회 실패: ${err}`);
  }
  return res.json() as Promise<PortOnePayment>;
}

export async function cancelPayment(
  paymentId: string,
  reason: string,
  amount?: number
): Promise<void> {
  const body: Record<string, unknown> = { reason };
  if (amount) body.amount = amount;

  const res = await fetch(`${PORTONE_API_URL}/payments/${paymentId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `PortOne ${getApiSecret()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PortOne 결제 취소 실패: ${err}`);
  }
}
