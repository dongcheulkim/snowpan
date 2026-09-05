import prisma from '../config/database';

// 광고 슬롯 가격 자동 시드 — 서버 시작 시 idempotent 업서트.
// 단가는 2026-09 개편 기준(월): 메인 100만 / 카테고리 50만 / 프리미엄 10만.
// (이전 베타 단가가 남아 새 환경에서 잘못된 가격이 생성되던 것 수정)
// 관리자가 별도 설정 없이도 6 개 카테고리 + main_banner + premium 가격이 자리잡음.
// 이미 admin 이 수정한 가격은 덮어쓰지 않음 (where 일치 시 update X).

// 카테고리 배너: 7개 (used/skishop/repair/rental/lesson/accommodation/community).
// 프리미엄: 3개만 (Product/SkiShop/RepairShop 모델만 isPremium 필드 보유).
//   → rental/lesson/accommodation/community 는 "최상단 고정" 의미가 약하고 모델도 미지원.
const BANNER_CATEGORIES = ['skishop', 'repair', 'used', 'rental', 'lesson', 'accommodation', 'community', 'overseas'];
// 프리미엄 확장 (2026-09): 모든 광고 카테고리 지원 — 렌탈·레슨·숙소·커뮤글·여행사 포함
const PREMIUM_CATEGORIES = ['used', 'skishop', 'repair', 'rental', 'lesson', 'accommodation', 'community', 'overseas'];

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
    pricePerDay: 100_000_000,
    maxConcurrent: 5,
    description: '홈 화면 상단 배너 (최대 5개 회전)',
  },
  // 카테고리 배너
  ...BANNER_CATEGORIES.map((category) => ({
    slotType: 'category',
    category,
    pricePerDay: 500_000,
    maxConcurrent: 2,
    description: `${category} 카테고리 페이지 상단 배너`,
  })),
  // 프리미엄 (3개만)
  ...PREMIUM_CATEGORIES.map((category) => ({
    slotType: 'premium',
    category,
    pricePerDay: 100_000,
    maxConcurrent: 3,
    description: `${category} 리스트 최상단 고정 (카테고리당 3개, 본인 등록물만)`,
  })),
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
