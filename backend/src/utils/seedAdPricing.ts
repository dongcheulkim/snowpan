import prisma from '../config/database';

// 광고 슬롯 가격 자동 시드 — 서버 시작 시 idempotent 업서트.
// 관리자가 별도 설정 없이도 6 개 카테고리 + main_banner + premium 가격이 자리잡음.
// 이미 admin 이 수정한 가격은 덮어쓰지 않음 (where 일치 시 update X).

const CATEGORIES = ['skishop', 'repair', 'used', 'rental', 'lesson', 'accommodation'];

const SEEDS: Array<{
  slotType: string;
  category: string;
  pricePerDay: number;
  maxConcurrent: number;
  description: string;
}> = [
  // 메인 배너 (홈)
  {
    slotType: 'main_banner',
    category: 'none',
    pricePerDay: 100_000,
    maxConcurrent: 3,
    description: '홈 화면 상단 배너 (최대 3개 회전)',
  },
  // 카테고리별 배너 + 프리미엄 (6개 카테고리)
  ...CATEGORIES.flatMap((category) => [
    {
      slotType: 'category',
      category,
      pricePerDay: 30_000,
      maxConcurrent: 2,
      description: `${category} 카테고리 페이지 상단 배너`,
    },
    {
      slotType: 'premium',
      category,
      pricePerDay: 1_000,
      maxConcurrent: 3,
      description: `${category} 리스트 최상단 고정 (카테고리당 3개)`,
    },
  ]),
];

export async function seedAdPricing(): Promise<void> {
  for (const seed of SEEDS) {
    try {
      const existing = await prisma.adSlotPricing.findFirst({
        where: { slotType: seed.slotType, category: seed.category },
      });
      if (existing) continue; // admin 이 손댔을 수 있어 덮어쓰지 않음
      await prisma.adSlotPricing.create({ data: { ...seed, active: true } });
      console.log(`광고 가격 시드: ${seed.slotType}/${seed.category} = ${seed.pricePerDay.toLocaleString()}원`);
    } catch (err) {
      console.error(`광고 가격 시드 실패 (${seed.slotType}/${seed.category}):`, err);
    }
  }
}
