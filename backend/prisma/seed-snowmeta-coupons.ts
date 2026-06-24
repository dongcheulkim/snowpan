// 스노우메타 할인권 3종 시드. 파트너 발급형 (effect 없음, 매장에서 코드 보여줘 사용).
// 큰 금액일수록 단가 할인 (10% / 15%) 적용.
//
// 실행: cd backend && npx tsx prisma/seed-snowmeta-coupons.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface Seed {
  title: string;
  description: string;
  pointsCost: number;
  discountValue: number; // 원
  validDays: number;
}

const COUPONS: Seed[] = [
  {
    title: '스노우메타 5,000원 할인권',
    description: '스노우메타에서 5,000원 할인. 매장에서 쿠폰 코드 제시 후 사용.',
    pointsCost: 5000,
    discountValue: 5000,
    validDays: 90,
  },
  {
    title: '스노우메타 10,000원 할인권',
    description: '스노우메타에서 10,000원 할인. 매장에서 쿠폰 코드 제시 후 사용.',
    pointsCost: 10000,
    discountValue: 10000,
    validDays: 90,
  },
  {
    title: '스노우메타 20,000원 할인권',
    description: '스노우메타에서 20,000원 할인. 매장에서 쿠폰 코드 제시 후 사용.',
    pointsCost: 20000,
    discountValue: 20000,
    validDays: 90,
  },
];

(async () => {
  for (const s of COUPONS) {
    const existing = await prisma.coupon.findFirst({
      where: { title: s.title },
    });
    if (existing) {
      const updated = await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          description: s.description,
          pointsCost: s.pointsCost,
          discountValue: s.discountValue,
          validDays: s.validDays,
          active: true,
        },
      });
      console.log('UPDATED', updated.title, '-', updated.pointsCost, 'P /', updated.discountValue, '원');
    } else {
      const created = await prisma.coupon.create({
        data: {
          title: s.title,
          description: s.description,
          pointsCost: s.pointsCost,
          partnerType: 'skishop',
          partnerId: null,
          discountType: 'flat',
          discountValue: s.discountValue,
          validDays: s.validDays,
          stock: null,
          active: true,
          vertical: 'snow',
        },
      });
      console.log('CREATED', created.title, '-', created.pointsCost, 'P /', created.discountValue, '원');
    }
  }
  await prisma.$disconnect();
})();
