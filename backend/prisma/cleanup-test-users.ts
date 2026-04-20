import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`🧹 Cleaning up test users on ${process.env.DATABASE_URL?.includes('render.com') ? 'Render (prod)' : 'local'}...`);

  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'test', endsWith: '@snowpan.com' } },
    select: { id: true, email: true },
  });

  if (testUsers.length === 0) { console.log('No test users found.'); return; }
  console.log(`Found ${testUsers.length} test users. Deleting their data...`);

  const ids = testUsers.map(u => u.id);

  // 외래키 제약 때문에 작성한 콘텐츠 먼저 제거
  const ops = [
    prisma.wishlist.deleteMany({ where: { userId: { in: ids } } }),
    prisma.postLike.deleteMany({ where: { userId: { in: ids } } }),
    prisma.comment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.post.deleteMany({ where: { userId: { in: ids } } }),
    prisma.review.deleteMany({ where: { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] } }),
    prisma.message.deleteMany({ where: { senderId: { in: ids } } }),
    prisma.chatRoom.deleteMany({ where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.badgeRequest.deleteMany({ where: { userId: { in: ids } } }),
    prisma.product.deleteMany({ where: { userId: { in: ids } } }),
    prisma.rental.deleteMany({ where: { userId: { in: ids } } }),
    prisma.lesson.deleteMany({ where: { userId: { in: ids } } }),
    prisma.accommodation.deleteMany({ where: { userId: { in: ids } } }),
  ];
  const results = await Promise.allSettled(ops);
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`  ⚠️ op ${i} failed:`, r.reason?.message || r.reason);
  });

  const deleted = await prisma.user.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`✅ Deleted ${deleted.count} test users and their related data.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
