// 쿠폰 카탈로그 조회 + 포인트로 구매 + 내 쿠폰 관리.

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { spendPoints, generateCouponCode } from '../utils/points';

// 공개 — 로그인 없이 쿠폰샵 둘러보기.
export const listCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const vertical = (req.query.vertical as string) || 'snow';
    const partnerType = req.query.partnerType as string | undefined;
    const sort = req.query.sort as string | undefined;

    const orderBy =
      sort === 'low' ? { pointsCost: 'asc' as const } :
      sort === 'high' ? { pointsCost: 'desc' as const } :
      { createdAt: 'desc' as const };

    const coupons = await prisma.coupon.findMany({
      where: {
        vertical,
        active: true,
        ...(partnerType ? { partnerType } : {}),
      },
      orderBy,
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        pointsCost: true,
        partnerType: true,
        partnerId: true,
        discountType: true,
        discountValue: true,
        image: true,
        validDays: true,
        stock: true,
      },
    });
    res.json({ coupons });
  } catch (err) {
    console.error('List coupons error:', err);
    res.status(500).json({ error: '쿠폰 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const getCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: req.params.id },
    });
    if (!coupon || !coupon.active) {
      res.status(404).json({ error: '쿠폰을 찾을 수 없습니다.' });
      return;
    }
    res.json(coupon);
  } catch (err) {
    console.error('Get coupon error:', err);
    res.status(500).json({ error: '쿠폰 조회 중 오류가 발생했습니다.' });
  }
};

// 포인트로 쿠폰 구매 — 잔액 차감 + UserCoupon 생성 + 재고 차감을 한 트랜잭션으로.
// AdMob 보상형 광고 시청 후 진행 — 최근 5분 미사용 AdView 1건 필수.
// 웹은 광고 미시청 허용(향후 자체 광고 도입 시 강제). 환경변수 AD_GATE_DISABLED=1 이면 우회.
const AD_GATE_WINDOW_MS = 5 * 60 * 1000;
export const purchaseCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const couponId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon || !coupon.active) throw Object.assign(new Error('쿠폰을 찾을 수 없습니다.'), { httpStatus: 404 });
      if (coupon.stock !== null && coupon.stock <= 0) throw Object.assign(new Error('쿠폰이 매진되었습니다.'), { httpStatus: 409 });

      // 광고 게이트 — 미시청이면 거절. 웹 미사용을 위해 모든 플랫폼 허용.
      const gateDisabled = process.env.AD_GATE_DISABLED === '1';
      if (!gateDisabled) {
        const recent = await tx.adView.findFirst({
          where: {
            userId,
            consumed: false,
            purpose: 'coupon_purchase',
            viewedAt: { gte: new Date(Date.now() - AD_GATE_WINDOW_MS) },
          },
          orderBy: { viewedAt: 'desc' },
          select: { id: true, platform: true },
        });
        if (!recent && process.env.AD_GATE_REQUIRE_FOR_WEB === '1') {
          throw Object.assign(new Error('광고 시청이 필요합니다.'), { httpStatus: 402, code: 'AD_REQUIRED' });
        }
        // 앱(ios/android) 사용자는 시청 필수.
        const reqPlatform = (req.headers['x-app-platform'] || '').toString().toLowerCase();
        if (!recent && (reqPlatform === 'ios' || reqPlatform === 'android')) {
          throw Object.assign(new Error('광고 시청이 필요합니다.'), { httpStatus: 402, code: 'AD_REQUIRED' });
        }
        if (recent) {
          await tx.adView.update({
            where: { id: recent.id },
            data: { consumed: true, consumedAt: new Date() },
          });
        }
      }

      // 재고 차감 (옵션) — 무제한이면 스킵.
      if (coupon.stock !== null) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { stock: { decrement: 1 } },
        });
      }

      // 포인트 차감 (잔액 부족 시 throw).
      await spendPoints(tx, {
        userId,
        amount: coupon.pointsCost,
        source: 'coupon_purchase',
        description: `쿠폰 구매: ${coupon.title}`,
      });

      // 쿠폰 발급.
      const code = generateCouponCode();
      const expiresAt = new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000);
      const userCoupon = await tx.userCoupon.create({
        data: {
          userId,
          couponId,
          code,
          expiresAt,
        },
        include: { coupon: true },
      });

      // 구매 트랜잭션의 refId 를 UserCoupon.id 로 맞춰주는 후처리 — 간단 구현에선 생략.
      return userCoupon;
    });

    res.status(201).json(result);
  } catch (err) {
    const e = err as Error & { code?: string; httpStatus?: number };
    if (e.code === 'INSUFFICIENT_POINTS') {
      res.status(402).json({ error: '포인트가 부족합니다.' });
      return;
    }
    if (e.httpStatus) {
      res.status(e.httpStatus).json({ error: e.message });
      return;
    }
    console.error('Purchase coupon error:', err);
    res.status(500).json({ error: '쿠폰 구매 중 오류가 발생했습니다.' });
  }
};

// 내 보유 쿠폰 목록 — status 별 필터.
export const myCoupons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const status = (req.query.status as string) || 'active';

    // 만료된 active 쿠폰은 한 번에 정리.
    if (status === 'active') {
      await prisma.userCoupon.updateMany({
        where: { userId, status: 'active', expiresAt: { lt: new Date() } },
        data: { status: 'expired' },
      });
    }

    const items = await prisma.userCoupon.findMany({
      where: { userId, ...(status === 'all' ? {} : { status }) },
      orderBy: { purchasedAt: 'desc' },
      include: {
        coupon: {
          select: {
            title: true,
            description: true,
            partnerType: true,
            discountType: true,
            discountValue: true,
            image: true,
          },
        },
      },
    });
    res.json({ items });
  } catch (err) {
    console.error('My coupons error:', err);
    res.status(500).json({ error: '내 쿠폰 조회 중 오류가 발생했습니다.' });
  }
};

// 쿠폰 사용 처리 — 매장에서 코드 입력 시 호출 (MVP 단계: 사용자가 직접 누름).
export const useCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    const updated = await prisma.userCoupon.updateMany({
      where: { id, userId, status: 'active', expiresAt: { gte: new Date() } },
      data: { status: 'used', usedAt: new Date() },
    });

    if (updated.count === 0) {
      res.status(409).json({ error: '사용할 수 없는 쿠폰입니다 (이미 사용/만료).' });
      return;
    }

    res.json({ message: '쿠폰이 사용 처리되었습니다.' });
  } catch (err) {
    console.error('Use coupon error:', err);
    res.status(500).json({ error: '쿠폰 사용 처리 중 오류가 발생했습니다.' });
  }
};
