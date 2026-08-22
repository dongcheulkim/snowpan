// 토스페이먼츠 결제 — 스노우판 전 결제 공통 모듈.
// 클라이언트 키는 VITE_TOSS_CLIENT_KEY (Vercel/빌드 env). SDK 는 필요 시 1회 로드.
const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || '';

/* eslint-disable @typescript-eslint/no-explicit-any */
let sdkPromise: Promise<any> | null = null;
function loadSdk(): Promise<any> {
  const w = window as any;
  if (w.TossPayments) return Promise.resolve(w.TossPayments);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.tosspayments.com/v1/payment';
      s.async = true;
      s.onload = () => resolve((window as any).TossPayments);
      s.onerror = () => reject(new Error('결제 모듈을 불러오지 못했어요.'));
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

export function tossConfigured(): boolean {
  return !!CLIENT_KEY;
}

// 결제 요청 — 토스 체크아웃으로 이동. 성공 시 successUrl?paymentKey&orderId&amount 로 복귀.
export async function requestTossPayment(opts: {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
}): Promise<void> {
  if (!CLIENT_KEY) throw new Error('결제 설정이 완료되지 않았어요. (VITE_TOSS_CLIENT_KEY)');
  const TossPayments = await loadSdk();
  const toss = TossPayments(CLIENT_KEY);
  await toss.requestPayment('카드', opts);
}
