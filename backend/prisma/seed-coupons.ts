// 샘플 쿠폰 시드 — 포인트샵 MVP. 운영자가 어드민에서 관리하기 전 초기 데이터.
// `npx ts-node prisma/seed-coupons.ts` 로 실행.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLES = [
  {
    title: '스키 렌탈 10% 할인',
    description: '제휴 렌탈샵 전 품목 10% 할인. 평일/주말 모두 사용 가능.',
    pointsCost: 1000,
    partnerType: 'rental',
    discountType: 'percent',
    discountValue: 10,
    validDays: 30,
    stock: null,
  },
  {
    title: '강습 1회 5,000원 할인',
    description: '제휴 강사 1:1 강습 1회 5,000원 즉시 할인. 첫 강습 한정.',
    pointsCost: 3000,
    partnerType: 'lesson',
    discountType: 'flat',
    discountValue: 5000,
    validDays: 60,
    stock: 50,
  },
  {
    title: '스키샵 신상 5% 할인',
    description: '제휴 스키샵 24-25 시즌 신상 5% 할인. 일부 한정 모델 제외.',
    pointsCost: 2000,
    partnerType: 'skishop',
    discountType: 'percent',
    discountValue: 5,
    validDays: 90,
    stock: null,
  },
  {
    title: '리조트 숙박 1박 10,000원 할인',
    description: '제휴 숙소 평일 1박 10,000원 할인. 2인 이상 예약 시.',
    pointsCost: 5000,
    partnerType: 'accommodation',
    discountType: 'flat',
    discountValue: 10000,
    validDays: 90,
    stock: 30,
  },
  {
    title: '정비 (왁싱+엣지) 무료',
    description: '제휴 정비샵 풀세트 정비 1회 무료. 시즌 한정.',
    pointsCost: 8000,
    partnerType: 'repair',
    discountType: 'flat',
    discountValue: 30000,
    validDays: 60,
    stock: 20,
  },
];

async function main() {
  console.log('🎟️ 쿠폰 샘플 시드 시작...');
  for (const s of SAMPLES) {
    // title + pointsCost 조합으로 중복 체크 (간단).
    const exists = await prisma.coupon.findFirst({
      where: { title: s.title, pointsCost: s.pointsCost },
    });
    if (exists) {
      console.log(`  ↪ 이미 존재: ${s.title}`);
      continue;
    }
    await prisma.coupon.create({ data: s });
    console.log(`  ✅ 생성: ${s.title} (${s.pointsCost}P)`);
  }
  console.log('✅ 쿠폰 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
