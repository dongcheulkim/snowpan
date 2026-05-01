// 일회성 정리 스크립트 — 기존 사용자 이메일 정규화 (lowercase + trim).
// 정규화 시 충돌 (이미 lowercase 형태가 존재) 발생하면 중복으로 보고.
// 안전하게 dry-run 먼저 실행하고 결과 확인 후 적용.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.APPLY !== '1';

async function main() {
  console.log(`🔍 모드: ${DRY_RUN ? 'DRY RUN (변경 X)' : 'APPLY (실제 변경)'}`);
  const users = await prisma.user.findMany({
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  let changes = 0;
  let conflicts = 0;
  for (const u of users) {
    const normalized = u.email.trim().toLowerCase();
    if (normalized === u.email) continue;

    const existing = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (existing && existing.id !== u.id) {
      console.warn(`⚠️ 충돌: ${u.id} (${u.email}) → ${normalized} 이미 존재 (${existing.id}). 수동 처리 필요.`);
      conflicts++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY] ${u.email}  →  ${normalized}`);
    } else {
      await prisma.user.update({ where: { id: u.id }, data: { email: normalized } });
      console.log(`✓ ${u.email}  →  ${normalized}`);
    }
    changes++;
  }

  console.log(`\n총 ${users.length}명, 변경 대상 ${changes}건, 충돌 ${conflicts}건.`);
  if (DRY_RUN && changes > 0) {
    console.log('\n실제 적용: APPLY=1 npx tsx prisma/normalize-emails.ts');
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
