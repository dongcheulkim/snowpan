import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
// PortOne 사용 안 함 (계좌이체 방식)
import { createBannerFromBooking } from '../utils/adBookingScheduler';
import { cacheDel } from '../utils/cache';

// 광고 슬롯 가격 목록 조회
export const getSlotPricings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pricings = await prisma.adSlotPricing.findMany({
      where: { active: true },
      orderBy: [{ slotType: 'asc' }, { category: 'asc' }],
    });
    res.json(pricings);
  } catch (error) {
    res.status(500).json({ error: '슬롯 가격 조회 실패' });
  }
};

// 특정 슬롯의 예약 불가 날짜 조회
export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slotType, category, month } = req.query;
    if (!slotType || !month) {
      res.status(400).json({ error: 'slotType, month 파라미터가 필요합니다.' });
      return;
    }

    const pricing = await prisma.adSlotPricing.findFirst({
      where: {
        slotType: slotType as string,
        category: (category as string) || 'none',
        active: true,
      },
    });

    if (!pricing) {
      res.status(404).json({ error: '해당 광고 슬롯이 존재하지 않습니다.' });
      return;
    }

    // 해당 월의 시작/끝 날짜
    const [year, mon] = (month as string).split('-').map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);

    // 해당 월에 겹치는 모든 예약 조회
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const bookings = await prisma.adBooking.findMany({
      where: {
        slotType: slotType as string,
        category: (category as string) || 'none',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        OR: [
          { status: { in: ['paid', 'active'] } },
          { status: 'pending_payment', createdAt: { gte: thirtyMinAgo } },
        ],
      },
      select: { startDate: true, endDate: true },
    });

    // 각 날짜별 예약 수 계산
    const unavailableDates: string[] = [];
    const daysInMonth = new Date(year, mon, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, mon - 1, day);
      let count = 0;
      for (const booking of bookings) {
        if (booking.startDate <= date && booking.endDate >= date) {
          count++;
        }
      }
      if (count >= pricing.maxConcurrent) {
        unavailableDates.push(date.toISOString().split('T')[0]);
      }
    }

    res.json({ unavailableDates, maxConcurrent: pricing.maxConcurrent, pricePerDay: pricing.pricePerDay });
  } catch (error) {
    res.status(500).json({ error: '가용성 조회 실패' });
  }
};

// 광고 예약 생성 (결제 대기 상태)
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { slotType, category, title, description, url, image, startDate, endDate, payMethod } = req.body;

    if (!slotType || !title || !description || !url || !startDate || !endDate) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      res.status(400).json({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      res.status(400).json({ error: '과거 날짜는 선택할 수 없습니다.' });
      return;
    }

    const pricing = await prisma.adSlotPricing.findFirst({
      where: { slotType, category: category || 'none', active: true },
    });
    if (!pricing) {
      res.status(404).json({ error: '해당 광고 슬롯이 존재하지 않습니다.' });
      return;
    }

    // 오래된 pending_payment 정리 (30분 초과)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.adBooking.updateMany({
      where: { status: 'pending_payment', createdAt: { lt: thirtyMinAgo } },
      data: { status: 'cancelled' },
    });

    // 같은 사용자의 기존 pending_payment 예약 취소
    await prisma.adBooking.updateMany({
      where: { userId, status: 'pending_payment' },
      data: { status: 'cancelled' },
    });

    // 트랜잭션으로 동시 예약 방지
    const booking = await prisma.$transaction(async (tx) => {

      // 기간 내 각 날짜에 대해 최대 동시 예약 수 체크
      const existingBookings = await tx.adBooking.findMany({
        where: {
          slotType,
          category: category || 'none',
          startDate: { lte: end },
          endDate: { gte: start },
          OR: [
            { status: { in: ['paid', 'active'] } },
            { status: 'pending_payment', createdAt: { gte: thirtyMinAgo } },
          ],
        },
        select: { startDate: true, endDate: true },
      });

      // 각 날짜 체크
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < days; i++) {
        const checkDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        let count = 0;
        for (const b of existingBookings) {
          if (b.startDate <= checkDate && b.endDate >= checkDate) count++;
        }
        if (count >= pricing.maxConcurrent) {
          throw new Error('선택한 기간에 예약 가능한 슬롯이 없습니다.');
        }
      }

      const totalDays = days;
      const basePrice = totalDays * pricing.pricePerDay;
      // 계좌이체 5% 할인
      const isTransfer = payMethod === 'TRANSFER';
      const discountAmount = isTransfer ? Math.round(basePrice * 0.05) : 0;
      const totalPrice = basePrice - discountAmount;
      const merchantUid = `snowpan_ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      return tx.adBooking.create({
        data: {
          slotType,
          category: category || 'none',
          title,
          description,
          url,
          image: image || 'none',
          startDate: start,
          endDate: end,
          totalDays,
          totalPrice,
          status: 'pending_payment',
          userId,
          pricingId: pricing.id,
          payment: {
            create: {
              paymentId: merchantUid, // 임시, 결제 후 업데이트
              merchantUid,
              payMethod: 'pending',
              amount: totalPrice,
              status: 'pending',
              paidAt: new Date(),
            },
          },
        },
      });
    });

    // payment의 merchantUid 반환
    const payment = await prisma.adPayment.findUnique({
      where: { bookingId: booking.id },
    });

    res.status(201).json({
      bookingId: booking.id,
      merchantUid: payment!.merchantUid,
      totalPrice: booking.totalPrice,
      totalDays: booking.totalDays,
    });
  } catch (error: any) {
    if (error.message?.includes('슬롯이 없습니다')) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('예약 생성 오류:', error);
      res.status(500).json({ error: '예약 생성 실패' });
    }
  }
};

// 결제 검증 (미사용 - 계좌이체 방식으로 변경)
export const verifyPayment = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(400).json({ error: '계좌이체 방식으로 변경되었습니다. 관리자 입금 확인을 기다려주세요.' });
  }
};

// 내 광고 예약 목록 조회
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const bookings = await prisma.adBooking.findMany({
      where: { userId },
      include: { payment: true, pricing: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: '예약 목록 조회 실패' });
  }
};

// 예약 취소
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const booking = await prisma.adBooking.findFirst({
      where: { id, userId },
      include: { payment: true },
    });

    if (!booking) {
      res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
      return;
    }

    if (booking.status === 'pending_payment') {
      await prisma.adBooking.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      if (booking.payment) {
        await prisma.adPayment.update({
          where: { bookingId: id },
          data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: '사용자 취소' },
        });
      }
      res.json({ success: true, message: '예약이 취소되었습니다.' });
      return;
    }

    if (booking.status === 'paid' || booking.status === 'active') {
      if (!booking.payment || booking.payment.status !== 'paid') {
        res.status(400).json({ error: '환불할 결제 정보가 없습니다.' });
        return;
      }

      // 이미 시작된 광고는 남은 일수만 환불
      const now = new Date();
      let refundAmount = booking.totalPrice;
      if (booking.status === 'active' && booking.startDate < now) {
        const elapsed = Math.ceil((now.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = booking.totalDays - elapsed;
        refundAmount = remaining > 0 ? remaining * (booking.totalPrice / booking.totalDays) : 0;
      }

      if (refundAmount <= 0) {
        res.status(400).json({ error: '환불 가능한 금액이 없습니다.' });
        return;
      }



      await prisma.$transaction([
        prisma.adBooking.update({
          where: { id },
          data: { status: 'refunded' },
        }),
        prisma.adPayment.update({
          where: { bookingId: id },
          data: {
            status: 'refunded',
            cancelledAt: new Date(),
            cancelReason: '사용자 취소',
            refundAmount: Math.round(refundAmount),
          },
        }),
      ]);

      // 배너 삭제
      await prisma.banner.deleteMany({ where: { title: booking.title, url: booking.url } });
      cacheDel('banners:public');

      res.json({ success: true, message: '환불이 처리되었습니다.', refundAmount: Math.round(refundAmount) });
      return;
    }

    res.status(400).json({ error: '취소할 수 없는 상태입니다.' });
  } catch (error) {
    console.error('예약 취소 오류:', error);
    res.status(500).json({ error: '예약 취소 실패' });
  }
};

// 현재 활성 광고 조회 (공개)
export const getActiveAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slotType, category } = req.query;
    const now = new Date();

    const where: any = {
      status: 'active',
      startDate: { lte: now },
      endDate: { gte: now },
    };
    if (slotType) where.slotType = slotType;
    if (category) where.category = category;

    const ads = await prisma.adBooking.findMany({
      where,
      select: {
        id: true,
        slotType: true,
        category: true,
        title: true,
        description: true,
        url: true,
        image: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: '활성 광고 조회 실패' });
  }
};

// 관리자: 모든 광고 예약 조회
export const adminGetBookings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.adBooking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
        pricing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: '예약 목록 조회 실패' });
  }
};

// 관리자: 매출 요약
export const adminGetRevenue = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.adPayment.findMany({
      where: { status: 'paid' },
      select: { amount: true, paidAt: true, refundAmount: true },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount - (p.refundAmount || 0), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyRevenue = payments
      .filter((p) => p.paidAt >= thisMonth)
      .reduce((sum, p) => sum + p.amount - (p.refundAmount || 0), 0);

    res.json({ totalRevenue, monthlyRevenue, totalPayments: payments.length });
  } catch (error) {
    res.status(500).json({ error: '매출 조회 실패' });
  }
};

// 관리자: 슬롯 가격 목록 (비활성 포함)
export const adminGetPricings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pricings = await prisma.adSlotPricing.findMany({
      orderBy: [{ slotType: 'asc' }, { category: 'asc' }],
    });
    res.json(pricings);
  } catch (error) {
    res.status(500).json({ error: '가격 목록 조회 실패' });
  }
};

// 관리자: 슬롯 가격 생성/수정
export const adminUpsertPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slotType, category, pricePerDay, maxConcurrent, description, active } = req.body;

    if (!slotType || !pricePerDay) {
      res.status(400).json({ error: 'slotType, pricePerDay는 필수입니다.' });
      return;
    }

    const pricing = await prisma.adSlotPricing.upsert({
      where: {
        slotType_category: { slotType, category: category || 'none' },
      },
      update: {
        pricePerDay,
        maxConcurrent: maxConcurrent || 1,
        description: description || 'none',
        active: active !== undefined ? active : true,
      },
      create: {
        slotType,
        category: category || 'none',
        pricePerDay,
        maxConcurrent: maxConcurrent || 1,
        description: description || 'none',
        active: active !== undefined ? active : true,
      },
    });

    res.json(pricing);
  } catch (error) {
    console.error('가격 설정 오류:', error);
    res.status(500).json({ error: '가격 설정 실패' });
  }
};

// 관리자: 슬롯 가격 수정
export const adminUpdatePricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pricePerDay, maxConcurrent, description, active } = req.body;

    const pricing = await prisma.adSlotPricing.update({
      where: { id },
      data: {
        ...(pricePerDay !== undefined && { pricePerDay }),
        ...(maxConcurrent !== undefined && { maxConcurrent }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: '가격 수정 실패' });
  }
};

// 관리자: 입금 확인 → 바로 active + 배너 생성
export const adminApproveBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await prisma.adBooking.findUnique({ where: { id } });
    if (!booking) {
      res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
      return;
    }

    if (booking.status !== 'pending_payment') {
      res.status(400).json({ error: '입금 대기 상태가 아닙니다.' });
      return;
    }

    // paid → active로 바로 전환 + 배너 생성
    await prisma.adBooking.update({ where: { id }, data: { status: 'active' } });
    await prisma.adPayment.update({
      where: { bookingId: id },
      data: { status: 'paid', payMethod: 'transfer', paidAt: new Date() },
    });

    await createBannerFromBooking(booking);

    await prisma.notification.create({
      data: {
        type: 'system',
        title: '광고 입금 확인',
        message: `"${booking.title}" 광고 입금이 확인되었습니다. 바로 노출됩니다!`,
        link: '/mypage',
        userId: booking.userId,
      },
    });

    res.json({ success: true, message: '입금 확인 완료, 광고 노출 시작' });
  } catch (error) {
    console.error('관리자 입금 확인 오류:', error);
    res.status(500).json({ error: '입금 확인 실패' });
  }
};

// 관리자: 예약 강제 취소/환불
export const adminCancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.adBooking.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!booking) {
      res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
      return;
    }

    if (booking.payment && booking.payment.status === 'paid') {
      await prisma.adPayment.update({
        where: { bookingId: id },
        data: {
          status: 'refunded',
          cancelledAt: new Date(),
          cancelReason: reason || '관리자 취소',
          refundAmount: booking.totalPrice,
        },
      });
    }

    await prisma.$transaction([
      prisma.adBooking.update({
        where: { id },
        data: { status: 'refunded', adminNote: reason || 'none' },
      }),
      prisma.notification.create({
        data: {
          type: 'system',
          title: '광고 예약 취소',
          message: `"${booking.title}" 광고가 관리자에 의해 취소되었습니다.${reason ? ` 사유: ${reason}` : ''}`,
          link: '/mypage',
          userId: booking.userId,
        },
      }),
    ]);

    // 배너 삭제
    await prisma.banner.deleteMany({ where: { title: booking.title, url: booking.url } });
    cacheDel('banners:public');

    res.json({ success: true });
  } catch (error) {
    console.error('관리자 예약 취소 오류:', error);
    res.status(500).json({ error: '예약 취소 실패' });
  }
};
