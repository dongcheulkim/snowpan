import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic placeholder image helpers (picsum.photos)
const img = (seed: string, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// URL 형식이면 '유효한 이미지'로 간주, 아니면 이모지/플레이스홀더 → 교체 대상
function needsReplacement(image: string | null | undefined): boolean {
  if (!image) return true;
  return !(image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/'));
}

async function main() {
  console.log('🖼  스노우판 테스트 이미지 시드 시작...');
  let total = 0;

  // 1) Rental
  const rentals = await prisma.rental.findMany({ select: { id: true, image: true, name: true } });
  for (const r of rentals) {
    if (!needsReplacement(r.image)) continue;
    await prisma.rental.update({ where: { id: r.id }, data: { image: img(`rental-${r.id}`) } });
    total++;
  }
  console.log(`  ✅ 렌탈 이미지 갱신: ${rentals.filter(r => needsReplacement(r.image)).length}/${rentals.length}`);

  // 2) Lesson
  const lessons = await prisma.lesson.findMany({ select: { id: true, image: true, name: true } });
  for (const l of lessons) {
    if (!needsReplacement(l.image)) continue;
    await prisma.lesson.update({ where: { id: l.id }, data: { image: img(`lesson-${l.id}`) } });
    total++;
  }
  console.log(`  ✅ 레슨 이미지 갱신: ${lessons.filter(l => needsReplacement(l.image)).length}/${lessons.length}`);

  // 3) Accommodation
  const accommodations = await prisma.accommodation.findMany({ select: { id: true, image: true, name: true } });
  for (const a of accommodations) {
    if (!needsReplacement(a.image)) continue;
    await prisma.accommodation.update({ where: { id: a.id }, data: { image: img(`acc-${a.id}`, 800, 500) } });
    total++;
  }
  console.log(`  ✅ 숙소 이미지 갱신: ${accommodations.filter(a => needsReplacement(a.image)).length}/${accommodations.length}`);

  // 4) SkiShop (new-equipment page)
  const skiShops = await prisma.skiShop.findMany({ select: { id: true, image: true, name: true } });
  for (const s of skiShops) {
    if (!needsReplacement(s.image)) continue;
    await prisma.skiShop.update({ where: { id: s.id }, data: { image: img(`skishop-${s.id}`, 800, 500) } });
    total++;
  }
  console.log(`  ✅ 스키샵 이미지 갱신: ${skiShops.filter(s => needsReplacement(s.image)).length}/${skiShops.length}`);

  // 5) RepairShop
  const repairShops = await prisma.repairShop.findMany({ select: { id: true, image: true, name: true } });
  for (const r of repairShops) {
    if (!needsReplacement(r.image)) continue;
    await prisma.repairShop.update({ where: { id: r.id }, data: { image: img(`repair-${r.id}`, 800, 500) } });
    total++;
  }
  console.log(`  ✅ 정비샵 이미지 갱신: ${repairShops.filter(r => needsReplacement(r.image)).length}/${repairShops.length}`);

  // 6) SkiResort (홈 상단 스키장 카드)
  const resorts = await prisma.skiResort.findMany({ select: { id: true, image: true, name: true } });
  for (const r of resorts) {
    if (!needsReplacement(r.image)) continue;
    await prisma.skiResort.update({ where: { id: r.id }, data: { image: img(`resort-${r.id}`, 800, 500) } });
    total++;
  }
  console.log(`  ✅ 리조트 이미지 갱신: ${resorts.filter(r => needsReplacement(r.image)).length}/${resorts.length}`);

  console.log(`\n🎉 총 ${total}개 레코드 이미지 갱신 완료.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌', e);
    await prisma.$disconnect();
    process.exit(1);
  });
