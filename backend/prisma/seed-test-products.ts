import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUNT = 100;

const subcats = ['ski', 'board', 'boots', 'binding', 'helmet', 'goggles', 'wear', 'etc'] as const;
const brandsBy: Record<string, string[]> = {
  ski: ['로시뇰', '피셔', '아토믹', '살로몬', '블리자드', '뵐클', '헤드', '노르디카'],
  board: ['버튼', 'SG', '나이트로', '카프리스', 'CAPiTA', '라이드', '사이트라인', 'K2'],
  boots: ['테크니카', '랑게', '달벨로', '아토믹', '노르디카', '살로몬', '헤드'],
  binding: ['마커', '살로몬', '룩', '티롤리아', '피비', 'ATK'],
  helmet: ['오클리', '스콧', '지로', 'POC', 'Smith', '카스코'],
  goggles: ['오클리', '스미스', 'POC', '지로', '드래곤', '엑스레이'],
  wear: ['노스페이스', '콜롬비아', '카파', '스파이더', '할티', '데카트론'],
  etc: ['스노우팬', '메이트', '로우', '제네릭'],
};
const conditions = ['상', '상중', '중', '하'];
const imageMap: Record<string, string> = { ski: '🎿', board: '🏂', boots: '🥾', binding: '⛓️', helmet: '⛑️', goggles: '🥽', wear: '🧥', etc: '📦' };
const sizeBy: Record<string, string[]> = {
  ski: ['155cm', '160cm', '165cm', '170cm', '175cm', '180cm', '185cm'],
  board: ['148cm', '152cm', '155cm', '158cm', '162cm', '165cm'],
  boots: ['240mm', '250mm', '255mm', '260mm', '265mm', '270mm', '275mm', '280mm'],
  binding: ['S', 'M', 'L', 'XL'],
  helmet: ['S', 'M', 'L', 'XL'],
  goggles: ['원사이즈'],
  wear: ['S', 'M', 'L', 'XL'],
  etc: [''],
};
const years = ['22-23', '23-24', '24-25', '25-26'];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const isProd = process.env.DATABASE_URL?.includes('render.com');
  console.log(`🌱 Seeding ${COUNT} test products on ${isProd ? 'Render (prod)' : 'local'}...`);

  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'test', endsWith: '@snowpan.com' } },
    select: { id: true },
  });
  if (testUsers.length === 0) {
    console.error('❌ No test users found. Run seed-test-users.ts first.');
    process.exit(1);
  }
  console.log(`Using ${testUsers.length} test users as sellers.`);

  let created = 0;
  for (let i = 1; i <= COUNT; i++) {
    const sub = pick(subcats);
    const brand = pick(brandsBy[sub]);
    const year = pick(years);
    const condition = pick(conditions);
    const sellerId = pick(testUsers).id;
    const basePrice = 50000 + Math.floor(Math.random() * 950) * 1000; // 50,000 ~ 999,000원
    const name = `${brand} ${sub === 'ski' ? '스키' : sub === 'board' ? '보드' : sub === 'boots' ? '부츠' : sub === 'binding' ? '바인딩' : sub === 'helmet' ? '헬멧' : sub === 'goggles' ? '고글' : sub === 'wear' ? '스키복' : '장비'} ${year}`;
    const size = pick(sizeBy[sub]);

    await prisma.product.create({
      data: {
        name,
        brand,
        subcategory: sub,
        price: basePrice,
        image: imageMap[sub],
        category: 'used',
        description: `${year} ${brand} ${sub} 상태 ${condition}. 테스트 시드 데이터입니다.`,
        condition,
        size: size || null,
        usageCount: `${year}년식`,
        userId: sellerId,
      },
    });
    created++;
    if (created % 20 === 0) console.log(`  ...${created} products`);
  }

  console.log(`✅ Done. Created ${created} products.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
