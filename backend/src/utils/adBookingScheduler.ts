import prisma from '../config/database';
import { cacheDel } from './cache';

// 광고 예약 상태 자동 전환 스케줄러
export async function updateAdBookingStatuses(): Promise<void> {
  const now = new Date();

  try {
    // pending_payment 30분 초과 → cancelled
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
    await prisma.adBooking.updateMany({
      where: {
        status: 'pending_payment',
        createdAt: { lt: thirtyMinAgo },
      },
      data: { status: 'cancelled' },
    });

    // paid + startDate <= now → active + 배너 자동 생성
    const toActivate = await prisma.adBooking.findMany({
      where: { status: 'paid', startDate: { lte: now } },
    });
    for (const booking of toActivate) {
      await prisma.adBooking.update({ where: { id: booking.id }, data: { status: 'active' } });
      await createBannerFromBooking(booking);
    }

    // active + endDate < now → completed + 배너 자동 삭제
    const toComplete = await prisma.adBooking.findMany({
      where: { status: 'active', endDate: { lt: now } },
    });
    for (const booking of toComplete) {
      await prisma.adBooking.update({ where: { id: booking.id }, data: { status: 'completed' } });
      await removeBannerFromBooking(booking.id);
    }

    if (toActivate.length > 0 || toComplete.length > 0) {
      cacheDel('banners:public');
    }
  } catch (error) {
    console.error('광고 상태 업데이트 오류:', error);
  }
}

// 광고 예약 → 배너 생성
export async function createBannerFromBooking(booking: { id: string; title: string; description: string; url: string; image: string | null }) {
  try {
    const maxOrder = await prisma.banner.aggregate({ _max: { order: true } });
    await prisma.banner.create({
      data: {
        title: booking.title,
        description: booking.description,
        tag: `ad:${booking.id}`,
        url: booking.url,
        image: booking.image || null,
        order: (maxOrder._max.order || 0) + 1,
        active: true,
      },
    });
    cacheDel('banners:public');
  } catch (error) {
    console.error('배너 생성 오류:', error);
  }
}

// 광고 종료 → 배너 삭제
async function removeBannerFromBooking(bookingId: string) {
  try {
    await prisma.banner.deleteMany({
      where: { tag: `ad:${bookingId}` },
    });
    cacheDel('banners:public');
  } catch (error) {
    console.error('배너 삭제 오류:', error);
  }
}

export function startAdBookingScheduler(): void {
  // 서버 시작 시 즉시 1회 실행
  updateAdBookingStatuses();
  // 1시간마다 실행
  setInterval(updateAdBookingStatuses, 60 * 60 * 1000);
  console.log('📅 광고 예약 스케줄러 시작됨');
}
