// 플랫폼 자체 발급 쿠폰 시드 — 끌어올리기 2종으로 시작.
// 광고 매출 카니발리제이션 피하기 위해 isPremium 안 건드림.
// 효과: Product.bumpedAt = now → 최신순 정렬에서 상단 재진입만.
//
// 실행: npx tsx prisma/seed-platform-coupons.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface Seed {
  title: string;
  description: string;
  pointsCost: number;
  effect: string;
  effectValue: number;
  validDays: number;
}

const PLATFORM_COUPONS: Seed[] = [
  {
    title: '매물 끌어올리기 1회',
    description: '내 매물 1개를 최신순 상단으로 다시 올려요. 묻혀있던 매물에 다시 노출 기회를 주세요.',
    pointsCost: 300,
    effect: 'product_bump',
    effectValue: 1,
    validDays: 90,
  },
  {
    title: '매물 끌어올리기 5회 묶음',
    description: '끌어올리기 5장. 한 매물에 여러 번 쓰거나 여러 매물에 나눠 쓸 수 있어요. (10% 할인)',
    pointsCost: 1200,
    effect: 'product_bump',
    effectValue: 5,
    validDays: 90,
  },
];

(async () => {
  for (const s of PLATFORM_COUPONS) {
    const existing = await prisma.coupon.findFirst({
      where: { title: s.title, partnerType: 'platform' },
    });
    if (existing) {
      const updated = await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          description: s.description,
          pointsCost: s.pointsCost,
          effect: s.effect,
          effectValue: s.effectValue,
          validDays: s.validDays,
          active: true,
        },
      });
      console.log('UPDATED', updated.title, '-', updated.pointsCost, 'P');
    } else {
      const created = await prisma.coupon.create({
        data: {
          title: s.title,
          description: s.description,
          pointsCost: s.pointsCost,
          partnerType: 'platform',
          discountType: 'none',
          discountValue: 0,
          effect: s.effect,
          effectValue: s.effectValue,
          validDays: s.validDays,
          stock: null,
          active: true,
          vertical: 'snow',
        },
      });
      console.log('CREATED', created.title, '-', created.pointsCost, 'P');
    }
  }
  await prisma.$disconnect();
})();
