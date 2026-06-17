// 포인트 적립/차감 공통 헬퍼.
// User.points 와 PointTransaction 을 한 트랜잭션 안에서 같이 갱신 — 정합성 보장.
// 모든 적립 소스(가입/추천/런/리뷰/쿠폰)가 이 두 함수만 호출하면 됨.

import { PrismaClient, Prisma } from '@prisma/client';

export type PointSource =
  | 'signup_bonus'
  | 'referral_bonus'
  | 'snow_run'
  | 'review'
  | 'daily_checkin'
  | 'coupon_purchase'
  | 'coupon_refund'
  | 'admin_grant'
  | 'admin_deduct'
  | 'expire';

export interface AwardArgs {
  userId: string;
  amount: number; // 양수만 (적립)
  source: PointSource;
  refId?: string;
  description?: string;
}

export interface SpendArgs {
  userId: string;
  amount: number; // 양수로 전달 (차감 시 내부에서 -)
  source: PointSource;
  refId?: string;
  description?: string;
}

// 트랜잭션 클라이언트도 허용 (다른 atomic 작업과 함께 묶을 때).
type Db = PrismaClient | Prisma.TransactionClient;

export async function awardPoints(db: Db, args: AwardArgs): Promise<{ balance: number; transactionId: string }> {
  if (args.amount <= 0) throw new Error('적립 금액은 양수여야 합니다.');

  // atomic — User.points 증가 + PointTransaction 기록.
  const user = await db.user.update({
    where: { id: args.userId },
    data: { points: { increment: args.amount } },
    select: { points: true },
  });

  const tx = await db.pointTransaction.create({
    data: {
      userId: args.userId,
      amount: args.amount,
      balanceAfter: user.points,
      source: args.source,
      refId: args.refId,
      description: args.description,
    },
    select: { id: true },
  });

  return { balance: user.points, transactionId: tx.id };
}

export async function spendPoints(db: Db, args: SpendArgs): Promise<{ balance: number; transactionId: string }> {
  if (args.amount <= 0) throw new Error('차감 금액은 양수여야 합니다.');

  // 잔액 확인 후 차감 — 동시성: SELECT 후 UPDATE 사이에 다른 트랜잭션이
  // 차감했을 가능성이 있으므로 호출자는 반드시 prisma.$transaction 으로 감쌀 것.
  const before = await db.user.findUnique({
    where: { id: args.userId },
    select: { points: true },
  });
  if (!before) throw new Error('사용자를 찾을 수 없습니다.');
  if (before.points < args.amount) {
    const err = new Error('포인트가 부족합니다.');
    (err as Error & { code?: string }).code = 'INSUFFICIENT_POINTS';
    throw err;
  }

  const user = await db.user.update({
    where: { id: args.userId },
    data: { points: { decrement: args.amount } },
    select: { points: true },
  });

  const tx = await db.pointTransaction.create({
    data: {
      userId: args.userId,
      amount: -args.amount,
      balanceAfter: user.points,
      source: args.source,
      refId: args.refId,
      description: args.description,
    },
    select: { id: true },
  });

  return { balance: user.points, transactionId: tx.id };
}

// 쿠폰 코드 생성 — 8자리 영숫자 (사람이 받아쓰기 가능 + 충돌 확률 낮음).
// 매장에서 확인용. 진짜 보안은 status 필드 (used/active) 가 담당.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 I, O, 0, 1 제외
export function generateCouponCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
