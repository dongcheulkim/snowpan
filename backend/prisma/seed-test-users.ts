import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COUNT = 150;
const COMMON_PASSWORD = 'test1234!';

async function main() {
  console.log(`🌱 Creating ${COUNT} test users on ${process.env.DATABASE_URL?.includes('render.com') ? 'Render (prod)' : 'local'}...`);
  const hashed = await bcrypt.hash(COMMON_PASSWORD, 10);

  let created = 0;
  let skipped = 0;
  for (let i = 1; i <= COUNT; i++) {
    const n = String(i).padStart(3, '0');
    const email = `test${n}@snowpan.com`;
    const phone = `010000${n.padStart(5, '0')}`;

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (exists) { skipped++; continue; }

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: `테스트유저${n}`,
        nickname: `테스터${n}`,
        phone,
        phoneVerified: true,
        role: 'user',
      },
    });
    created++;
    if (created % 20 === 0) console.log(`  ...${created} created`);
  }

  console.log(`✅ Done. Created: ${created}, Skipped (already existed): ${skipped}`);
  console.log(`📌 Login: test001@snowpan.com ~ test${String(COUNT).padStart(3, '0')}@snowpan.com`);
  console.log(`📌 Password (all): ${COMMON_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
