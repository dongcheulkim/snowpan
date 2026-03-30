import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = ['used', 'rental', 'lesson', 'accommodation'];

  for (const category of categories) {
    await prisma.adSlotPricing.upsert({
      where: { slotType_category: { slotType: 'premium', category } },
      update: { pricePerDay: 1000, maxConcurrent: 3 },
      create: {
        slotType: 'premium',
        category,
        pricePerDay: 1000,
        maxConcurrent: 3,
        description: `${category} 프리미엄 노출 (카테고리당 최대 3개)`,
        active: true,
      },
    });
    console.log(`premium/${category}: 1,000원/일, 최대 3개`);
  }

  console.log('프리미엄 광고 설정 완료');
}

main().catch(console.error).finally(() => prisma.$disconnect());
