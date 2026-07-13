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
        effect: true,
        effectValue: true,
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
      // 조건부 원자 업데이트: UPDATE 가 행 락을 잡으므로 Read Committed 에서도
      // 마지막 1개를 두 명이 동시에 사는 oversell 이 차단됨 (두 번째는 count=0).
      if (coupon.stock !== null) {
        const dec = await tx.coupon.updateMany({
          where: { id: couponId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (dec.count === 0) {
          throw Object.assign(new Error('쿠폰이 매진되었습니다.'), { httpStatus: 409 });
        }
      }

      // 포인트 차감 (잔액 부족 시 throw).
      await spendPoints(tx, {
        userId,
        amount: coupon.pointsCost,
        source: 'coupon_purchase',
        description: `쿠폰 구매: ${coupon.title}`,
      });

      // 쿠폰 발급. 다회권은 effectValue 만큼 usesLeft 세팅.
      const code = generateCouponCode();
      const expiresAt = new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000);
      const uses = coupon.effectValue && coupon.effectValue > 1 ? coupon.effectValue : 1;
      const userCoupon = await tx.userCoupon.create({
        data: {
          userId,
          couponId,
          code,
          expiresAt,
          usesLeft: uses,
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
            effect: true,
            effectValue: true,
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

// 쿠폰 사용 처리 — 두 종류:
//  1) 파트너 발급 (effect=null): 매장에서 코드 보여줄 때 사용자가 직접 누름. usesLeft=1.
//  2) 플랫폼 효과형 (effect='product_bump' 등): productId 받아 효과 적용. 다회권 (usesLeft>1) 지원.
export const useCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const { productId } = req.body ?? {};

    const result = await prisma.$transaction(async (tx) => {
      const uc = await tx.userCoupon.findUnique({
        where: { id },
        include: { coupon: { select: { effect: true, title: true } } },
      });
      if (!uc || uc.userId !== userId) {
        throw Object.assign(new Error('쿠폰을 찾을 수 없습니다.'), { httpStatus: 404 });
      }
      if (uc.status !== 'active') {
        throw Object.assign(new Error('이미 사용/만료된 쿠폰이에요.'), { httpStatus: 409 });
      }
      if (uc.expiresAt < new Date()) {
        await tx.userCoupon.update({ where: { id }, data: { status: 'expired' } });
        throw Object.assign(new Error('만료된 쿠폰이에요.'), { httpStatus: 409 });
      }
      if (uc.usesLeft <= 0) {
        await tx.userCoupon.update({ where: { id }, data: { status: 'used' } });
        throw Object.assign(new Error('남은 사용 횟수가 없어요.'), { httpStatus: 409 });
      }

      // 원자 차감 가드 — 더블탭/멀티 디바이스 동시 사용 차단.
      // UPDATE 가 행 락을 잡아 Read Committed 에서도 두 번째 요청은
      // usesLeft 조건 불충족 (count=0) 으로 거부됨.
      const dec = await tx.userCoupon.updateMany({
        where: { id, userId, status: 'active', usesLeft: { gt: 0 }, expiresAt: { gte: new Date() } },
        data: { usesLeft: { decrement: 1 } },
      });
      if (dec.count === 0) {
        throw Object.assign(new Error('이미 처리됐거나 사용할 수 없는 쿠폰이에요.'), { httpStatus: 409 });
      }

      // 플랫폼 효과 적용 — 실패 시 throw → 트랜잭션 롤백으로 위 차감도 취소.
      if (uc.coupon.effect === 'product_bump') {
        if (typeof productId !== 'string' || !productId) {
          throw Object.assign(new Error('내 매물을 선택해주세요.'), { httpStatus: 400 });
        }
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, userId: true, status: true },
        });
        if (!product || product.userId !== userId) {
          throw Object.assign(new Error('본인 매물에만 사용할 수 있어요.'), { httpStatus: 403 });
        }
        if (product.status !== 'selling') {
          throw Object.assign(new Error('판매중인 매물에만 사용할 수 있어요.'), { httpStatus: 400 });
        }
        await tx.product.update({
          where: { id: productId },
          data: { bumpedAt: new Date() },
        });
      } else if (uc.coupon.effect === 'referral_boost') {
        // 초대 2배 — 7일간 추천 보너스 2배. 기존 잔여 기간이 있으면 이어붙임.
        const cur = await tx.user.findUnique({ where: { id: userId }, select: { referralBoostUntil: true } });
        const from = cur?.referralBoostUntil && cur.referralBoostUntil > new Date() ? cur.referralBoostUntil : new Date();
        const until = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
        await tx.user.update({ where: { id: userId }, data: { referralBoostUntil: until } });
      } else if (uc.coupon.effect === 'profile_highlight') {
        // 프로필 강조 — 7일.
        const cur = await tx.user.findUnique({ where: { id: userId }, select: { profileHighlightUntil: true } });
        const from = cur?.profileHighlightUntil && cur.profileHighlightUntil > new Date() ? cur.profileHighlightUntil : new Date();
        const until = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
        await tx.user.update({ where: { id: userId }, data: { profileHighlightUntil: until } });
      } else if (uc.coupon.effect === 'badge_fasttrack') {
        // 뱃지 신속처리 — 내 대기중 뱃지 요청을 우선순위로.
        const pending = await tx.badgeRequest.findFirst({
          where: { userId, status: 'pending' },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (!pending) {
          throw Object.assign(new Error('대기중인 뱃지 인증 요청이 없어요. 먼저 인증을 신청해주세요.'), { httpStatus: 400 });
        }
        await tx.badgeRequest.update({ where: { id: pending.id }, data: { priority: true } });
      } else if (uc.coupon.effect) {
        // 알 수 없는 효과
        throw Object.assign(new Error('이 쿠폰은 아직 사용할 수 없어요.'), { httpStatus: 400 });
      }

      // 차감 후 상태 확정 — 0 이 되면 used 마킹.
      let updated = await tx.userCoupon.findUniqueOrThrow({ where: { id } });
      if (updated.usesLeft <= 0 && updated.status === 'active') {
        updated = await tx.userCoupon.update({
          where: { id },
          data: { status: 'used', usedAt: new Date() },
        });
      }

      return { updated, effect: uc.coupon.effect, productId };
    });

    const effectMsg: Record<string, string> = {
      product_bump: '매물을 끌어올렸어요!',
      referral_boost: '7일간 초대 보너스가 2배로 적용돼요!',
      profile_highlight: '7일간 프로필이 강조돼요!',
      badge_fasttrack: '뱃지 인증이 우선 처리 대기열로 이동했어요!',
    };
    res.json({
      message: (result.effect && effectMsg[result.effect]) || '쿠폰이 사용 처리되었어요.',
      usesLeft: result.updated.usesLeft,
      status: result.updated.status,
    });
  } catch (err) {
    const e = err as Error & { httpStatus?: number };
    if (e.httpStatus) {
      res.status(e.httpStatus).json({ error: e.message });
      return;
    }
    console.error('Use coupon error:', err);
    res.status(500).json({ error: '쿠폰 사용 처리 중 오류가 발생했습니다.' });
  }
};
