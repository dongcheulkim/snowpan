import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createBannerFromBooking, applyPremiumFromBooking } from '../utils/adBookingScheduler';
import { cacheDel } from '../utils/cache';
import { notifyAdmins } from './notificationController';

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
    const { slotType, category, title, description, url, image, textColor, textAlign, startDate, endDate, payMethod } = req.body;

    if (!slotType || !title || !description || !startDate || !endDate) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    // URL 은 선택. 빈 문자열 = "URL 없음" (광고 클릭해도 이동 X).
    // 있을 때만 프로토콜 검증 (javascript:/data: 등 차단).
    if (typeof url !== 'string' || url.length > 2048) {
      res.status(400).json({ error: 'URL 형식이 올바르지 않습니다.' });
      return;
    }
    const urlTrimmed = url.trim();
    if (urlTrimmed === '') {
      // URL 없음 — OK
    } else if (urlTrimmed.startsWith('/')) {
      // 사이트 내부 경로 — OK
    } else if (/^https?:\/\//i.test(urlTrimmed)) {
      try {
        const parsed = new URL(urlTrimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          res.status(400).json({ error: 'http/https URL 만 허용됩니다.' });
          return;
        }
      } catch {
        res.status(400).json({ error: 'URL 형식이 올바르지 않습니다.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'URL 은 / 로 시작하거나 https:// 로 시작해야 합니다.' });
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

    // 프리미엄 슬롯: URL 이 가리키는 상품/샵이 본인 소유인지 검증.
    // 남의 등록물을 임의로 프리미엄 띄우는 것 방지.
    if (slotType === 'premium') {
      const match = String(url).match(/\/(used|skishop|repair)\/([A-Za-z0-9_-]+)/);
      if (!match) {
        res.status(400).json({ error: '프리미엄 광고 URL 은 본인 등록물의 상세 페이지여야 합니다 (예: /used/<id>).' });
        return;
      }
      const [, kind, targetId] = match;
      let owned = false;
      if (kind === 'used') {
        const p = await prisma.product.findUnique({ where: { id: targetId }, select: { userId: true } });
        owned = !!p && p.userId === userId;
      } else if (kind === 'skishop') {
        const s = await prisma.skiShop.findUnique({ where: { id: targetId }, select: { userId: true } });
        owned = !!s && s.userId === userId;
      } else if (kind === 'repair') {
        const r = await prisma.repairShop.findUnique({ where: { id: targetId }, select: { userId: true } });
        owned = !!r && r.userId === userId;
      }
      if (!owned) {
        res.status(403).json({ error: '본인이 등록한 상품/샵만 프리미엄으로 띄울 수 있습니다.' });
        return;
      }
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

      // 계좌이체 방식: 모든 예약은 pending_payment 로 시작하고 관리자가 입금 확인 후 승인
      return tx.adBooking.create({
        data: {
          slotType,
          category: category || 'none',
          title,
          description,
          url,
          image: image || null,
          textColor: textColor || null,
          textAlign: textAlign || null,
          startDate: start,
          endDate: end,
          totalDays,
          totalPrice,
          status: 'pending_payment',
          userId,
          pricingId: pricing.id,
          payment: {
            create: {
              paymentId: merchantUid,
              merchantUid,
              payMethod: payMethod === 'TRANSFER' ? 'transfer' : (payMethod || 'transfer'),
              amount: totalPrice,
              status: 'pending',
              paidAt: new Date(),
            },
          },
        },
      });
    });

    await notifyAdmins('system', '새 광고 신청', `"${title}" 광고가 신청되었습니다. (${booking.totalPrice.toLocaleString()}원)`, '/admin');

    // 관리자와 채팅방 자동 생성 + 입금 안내 메시지 자동 발송. 실패해도 예약은 성공.
    let chatRoomId: string | null = null;
    try {
      const admin = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (admin && admin.id !== userId) {
        const [u1, u2] = [userId, admin.id].sort();
        let room = await prisma.chatRoom.findUnique({
          where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
          select: { id: true },
        });
        if (!room) {
          room = await prisma.chatRoom.create({
            data: { user1Id: u1, user2Id: u2 },
            select: { id: true },
          });
        }
        chatRoomId = room.id;

        // 신청자 가입정보 — 관리자가 입금 확인할 때 매칭용.
        const applicant = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, nickname: true, phone: true, email: true },
        });

        // 입금 안내 양식. env 에 계좌 정보 있으면 자동 채움, 없으면 placeholder.
        const bank = process.env.AD_DEPOSIT_BANK;
        const account = process.env.AD_DEPOSIT_ACCOUNT;
        const holder = process.env.AD_DEPOSIT_HOLDER;
        const fmt = (d: Date) => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
        const accountBlock = (bank && account && holder)
          ? `🏦 입금 계좌\n  • 은행: ${bank}\n  • 계좌: ${account}\n  • 예금주: ${holder}`
          : `🏦 입금 계좌는 곧 안내드리겠습니다.`;
        const applicantBlock = applicant
          ? `👤 신청자 정보\n` +
            `  • 성함: ${applicant.name || '-'}${applicant.nickname ? ` (${applicant.nickname})` : ''}\n` +
            `  • 연락처: ${applicant.phone || '-'}\n` +
            `  • 이메일: ${applicant.email || '-'}\n` +
            `\n`
          : '';
        const depositMsg =
          `📢 광고 신청이 접수되었습니다.\n` +
          `\n` +
          `📋 신청 내역\n` +
          `  • 광고: ${title}\n` +
          `  • 기간: ${fmt(new Date(startDate))} ~ ${fmt(new Date(endDate))} (${booking.totalDays}일)\n` +
          `  • 금액: ${booking.totalPrice.toLocaleString()}원\n` +
          `  • 예약번호: ${booking.id.slice(0, 8)}\n` +
          `\n` +
          applicantBlock +
          `${accountBlock}\n` +
          `\n` +
          `입금자명을 신청자 성함으로 해주시면 빠른 확인이 가능합니다.\n` +
          `입금 확인 후 관리자가 승인하면 광고가 노출됩니다. 문의는 이 채팅방으로 주세요.`;

        await prisma.message.create({
          data: { roomId: room.id, senderId: admin.id, content: depositMsg, type: 'text' },
        });
        await prisma.chatRoom.update({ where: { id: room.id }, data: { updatedAt: new Date() } });
      }
    } catch (e) {
      console.error('Auto deposit chat message failed:', e);
    }

    res.status(201).json({
      bookingId: booking.id,
      totalPrice: booking.totalPrice,
      totalDays: booking.totalDays,
      chatRoomId,
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

// 광고 내역 삭제 (종료/취소된 것만)
export const deleteBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const booking = await prisma.adBooking.findFirst({ where: { id, userId } });
    if (!booking) { res.status(404).json({ error: '예약을 찾을 수 없습니다.' }); return; }
    if (['active', 'paid', 'pending_payment'].includes(booking.status)) {
      res.status(400).json({ error: '진행 중인 광고는 삭제할 수 없습니다. 먼저 취소해주세요.' }); return;
    }
    await prisma.adPayment.deleteMany({ where: { bookingId: id } });
    await prisma.adBooking.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: '삭제 실패' });
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
      await prisma.banner.deleteMany({ where: { tag: `ad:${id}` } });
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
        textColor: true,
        textAlign: true,
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
    if (_req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    if (_req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    if (_req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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

    await prisma.adPayment.update({
      where: { bookingId: id },
      data: { status: 'paid', payMethod: 'transfer', paidAt: new Date() },
    });

    // 시작일이 미래면 즉시 노출하지 않고 paid 로만 — 스케줄러가 startDate 도래 시 활성화.
    // (이전엔 미래 광고도 승인 즉시 active + 배너 생성되어 광고비 기간 전 무료 노출)
    const startsInFuture = new Date(booking.startDate) > new Date();
    if (startsInFuture) {
      await prisma.adBooking.update({ where: { id }, data: { status: 'paid' } });
    } else {
      await prisma.adBooking.update({ where: { id }, data: { status: 'active' } });
      // slotType 별 활성화 분기:
      // - premium: 대상 상품/샵 isPremium=true (배너 X)
      // - main_banner: 홈 Banner 레코드 생성 (홈 rotator 노출)
      // - category: adBooking 레코드 자체로 카테고리 페이지에서 직접 조회
      if (booking.slotType === 'premium') {
        await applyPremiumFromBooking(booking);
      } else if (booking.slotType === 'main_banner') {
        await createBannerFromBooking(booking);
      }
      cacheDel('banners:public');
    }

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

// 관리자: 무료 승인 (입금 없이 바로 active)
export const adminFreeApprove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;

    const booking = await prisma.adBooking.findUnique({ where: { id } });
    if (!booking) { res.status(404).json({ error: '예약을 찾을 수 없습니다.' }); return; }

    await prisma.adPayment.upsert({
      where: { bookingId: id },
      update: { status: 'paid', amount: 0, payMethod: 'free', paidAt: new Date() },
      create: { bookingId: id, paymentId: `free_${id}`, merchantUid: `free_${id}`, payMethod: 'free', amount: 0, status: 'paid', paidAt: new Date() },
    });

    // 미래 시작일이면 paid 로만 (스케줄러가 활성화). 즉시 시작이면 바로 active + 노출.
    const startsInFuture = new Date(booking.startDate) > new Date();
    if (startsInFuture) {
      await prisma.adBooking.update({ where: { id }, data: { status: 'paid', totalPrice: 0, adminNote: '무료 승인' } });
    } else {
      await prisma.adBooking.update({ where: { id }, data: { status: 'active', totalPrice: 0, adminNote: '무료 승인' } });
      if (booking.slotType === 'premium') {
        await applyPremiumFromBooking(booking);
      } else if (booking.slotType === 'main_banner') {
        await createBannerFromBooking(booking);
      }
      cacheDel('banners:public');
    }

    await prisma.notification.create({
      data: {
        type: 'system',
        title: '광고 무료 승인',
        message: `"${booking.title}" 광고가 무료로 승인되었습니다!`,
        link: '/mypage',
        userId: booking.userId,
      },
    });

    res.json({ success: true, message: '무료 승인 완료' });
  } catch (error) {
    console.error('관리자 무료 승인 오류:', error);
    res.status(500).json({ error: '입금 확인 실패' });
  }
};

// 관리자: 예약 강제 취소/환불
export const adminCancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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
    await prisma.banner.deleteMany({ where: { tag: `ad:${id}` } });
    cacheDel('banners:public');

    res.json({ success: true });
  } catch (error) {
    console.error('관리자 예약 취소 오류:', error);
    res.status(500).json({ error: '예약 취소 실패' });
  }
};
