import prisma from '../config/database';
import { cacheDel } from './cache';

// 광고 예약 상태 자동 전환 스케줄러
export async function updateAdBookingStatuses(): Promise<void> {
  const now = new Date();

  try {
    // pending_payment 72시간 초과 → cancelled.
    // (기존 30분은 온라인결제 전제 — 베타 무통장(입금 후 관리자 승인) 흐름에선
    //  입금·확인에 하루 이상 걸려 승인 전에 전부 취소돼 승인 불가였음)
    const ttlAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    await prisma.adBooking.updateMany({
      where: {
        status: 'pending_payment',
        createdAt: { lt: ttlAgo },
      },
      data: { status: 'cancelled' },
    });

    // paid + 검수 승인됨 + startDate <= now → active + 배너 자동 생성 + 프리미엄 적용.
    // approvedAt 조건 — 카드 결제 완료(paid) 건이 관리자 검수 전에 자동 게재되던 구멍 차단.
    const toActivate = await prisma.adBooking.findMany({
      where: { status: 'paid', approvedAt: { not: null }, startDate: { lte: now } },
    });
    for (const booking of toActivate) {
      // 원자적 CAS — status='paid' 인 경우에만 active 로. 다중 인스턴스/중복 실행 시
      // 실제로 상태를 바꾼 (count=1) 인스턴스만 배너/프리미엄 생성 → 배너 중복 생성 방지.
      const claimed = await prisma.adBooking.updateMany({
        where: { id: booking.id, status: 'paid' },
        data: { status: 'active' },
      });
      if (claimed.count === 0) continue; // 다른 인스턴스가 이미 처리
      if (booking.slotType === 'premium') {
        await applyPremiumFromBooking(booking);
      } else if (booking.slotType === 'main_banner') {
        await createBannerFromBooking(booking);
      }
      // category 타입은 adBooking 레코드 자체가 카테고리 페이지에 노출 — Banner 추가 X
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

    // 프리미엄 만료 처리 (상품 + 스키샵 + 정비샵)
    await prisma.product.updateMany({
      where: { isPremium: true, premiumUntil: { lt: now } },
      data: { isPremium: false, premiumUntil: null },
    });
    await prisma.skiShop.updateMany({
      where: { isPremium: true, premiumUntil: { lt: now } },
      data: { isPremium: false, premiumUntil: null },
    });
    await prisma.repairShop.updateMany({
      where: { isPremium: true, premiumUntil: { lt: now } },
      data: { isPremium: false, premiumUntil: null },
    });
  } catch (error) {
    console.error('광고 상태 업데이트 오류:', error);
  }
}

// 프리미엄 광고 활성화 — booking.url 에서 대상 (상품/스키샵/정비샵) 추출 후 isPremium=true.
// URL 형식: '/used/<id>', '/skishop/<id>', '/repair/<id>' (또는 절대 URL).
// premiumUntil = booking.endDate 로 설정 → 광고 만료와 함께 자동 해제.
export async function applyPremiumFromBooking(booking: {
  id: string;
  slotType: string;
  url: string;
  endDate: Date;
}): Promise<void> {
  if (booking.slotType !== 'premium' || !booking.url) return;
  // 절대 URL 이어도 path 만 추출
  const match = booking.url.match(/\/(used|skishop|repair)\/([A-Za-z0-9_-]+)/);
  if (!match) {
    console.warn(`프리미엄 광고 URL 파싱 실패: ${booking.url}`);
    return;
  }
  const kind = match[1];
  const targetId = match[2];
  try {
    if (kind === 'used') {
      await prisma.product.update({
        where: { id: targetId },
        data: { isPremium: true, premiumUntil: booking.endDate },
      });
    } else if (kind === 'skishop') {
      await prisma.skiShop.update({
        where: { id: targetId },
        data: { isPremium: true, premiumUntil: booking.endDate },
      });
    } else if (kind === 'repair') {
      await prisma.repairShop.update({
        where: { id: targetId },
        data: { isPremium: true, premiumUntil: booking.endDate },
      });
    }
  } catch (error) {
    console.error(`프리미엄 적용 실패 (${kind}/${targetId}):`, error);
  }
}

// 프리미엄 광고 취소/환불 시 대상 상품·샵의 프리미엄 즉시 해제.
// (기존엔 premiumUntil 만료까지 프리미엄이 유지되어 "결제→활성화→즉시 환불" 악용 가능했음)
export async function revokePremiumFromBooking(booking: { slotType: string; url: string }): Promise<void> {
  if (booking.slotType !== 'premium' || !booking.url) return;
  const match = booking.url.match(/\/(used|skishop|repair)\/([A-Za-z0-9_-]+)/);
  if (!match) return;
  const [, kind, targetId] = match;
  const data = { isPremium: false, premiumUntil: null };
  try {
    if (kind === 'used') await prisma.product.update({ where: { id: targetId }, data });
    else if (kind === 'skishop') await prisma.skiShop.update({ where: { id: targetId }, data });
    else if (kind === 'repair') await prisma.repairShop.update({ where: { id: targetId }, data });
  } catch (error) {
    console.error(`프리미엄 해제 실패 (${kind}/${targetId}):`, error);
  }
}

// 광고 예약 → 배너 생성 (멱등 — 같은 예약의 배너가 이미 있으면 스킵, 중복 노출 방지)
export async function createBannerFromBooking(booking: { id: string; title: string; description: string; url: string; image: string | null; textColor?: string | null; textAlign?: string | null; imagePos?: string | null }) {
  try {
    const exists = await prisma.banner.findFirst({ where: { tag: `ad:${booking.id}` }, select: { id: true } });
    if (exists) return;
    const maxOrder = await prisma.banner.aggregate({ _max: { order: true } });
    await prisma.banner.create({
      data: {
        title: booking.title,
        description: booking.description,
        tag: `ad:${booking.id}`,
        url: booking.url,
        image: booking.image || null,
        textColor: booking.textColor || null,
        textAlign: booking.textAlign || null,
        imagePos: booking.imagePos || null,
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
