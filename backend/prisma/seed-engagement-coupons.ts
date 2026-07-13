// 플랫폼 참여형 쿠폰 3종 — 초대 2배 / 프로필 강조 / 뱃지 신속처리.
// effect + effectValue(사용 횟수). 광고 매출 무관 (비매출 영역).
//
// 실행: cd backend && npx tsx prisma/seed-engagement-coupons.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface Seed {
  title: string;
  description: string;
  pointsCost: number;
  effect: string;
  validDays: number;
}

const COUPONS: Seed[] = [
  {
    title: '초대 2배 (7일)',
    description: '사용 후 7일간, 내 추천 코드로 친구가 가입하면 내 보너스가 2배(1,000P)로 적립돼요.',
    pointsCost: 2000,
    effect: 'referral_boost',
    validDays: 90,
  },
  {
    title: '프로필 강조 (7일)',
    description: '사용 후 7일간, 판매자 프로필에 강조 표시가 붙어 더 눈에 띄어요.',
    pointsCost: 1000,
    effect: 'profile_highlight',
    validDays: 90,
  },
  {
    title: '뱃지 인증 신속처리',
    description: '대기중인 뱃지 인증 요청을 관리자 승인 대기열 상단으로 올려요. (먼저 인증 신청 필요)',
    pointsCost: 1500,
    effect: 'badge_fasttrack',
    validDays: 90,
  },
];

(async () => {
  for (const s of COUPONS) {
    const existing = await prisma.coupon.findFirst({ where: { title: s.title, partnerType: 'platform' } });
    const data = {
      description: s.description,
      pointsCost: s.pointsCost,
      partnerType: 'platform',
      partnerId: null,
      discountType: 'none',
      discountValue: 0,
      effect: s.effect,
      effectValue: 1,
      validDays: s.validDays,
      stock: null,
      active: true,
      vertical: 'snow',
    };
    if (existing) {
      await prisma.coupon.update({ where: { id: existing.id }, data });
      console.log('UPDATED', s.title, '-', s.pointsCost, 'P');
    } else {
      await prisma.coupon.create({ data: { title: s.title, ...data } });
      console.log('CREATED', s.title, '-', s.pointsCost, 'P');
    }
  }
  await prisma.$disconnect();
})();
