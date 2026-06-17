// 부하 테스트 — 실제 운영 데이터처럼 중고/커뮤글/리뷰/채팅/포인트 거래 등 섞어서 채움.
// 모든 행에 LOADTEST_ 마커 → cleanup 으로 일괄 삭제 가능.
//
// 실행 (Render Shell):
//   npx tsx prisma/load-test.ts fill 1000     # 1000명 분량 채움 (혼합 데이터)
//   npx tsx prisma/load-test.ts measure       # 현재 DB 사이즈만 측정
//   npx tsx prisma/load-test.ts cleanup       # LOADTEST_ 행 일괄 삭제
//
// 각 user 당 평균:
//   - 중고매물 5개
//   - 커뮤글 3개
//   - 댓글 5개
//   - 채팅방 2개 + 메시지 10개씩
//   - 포인트 거래 5건
//
// → 1000명 ≈ ~50K 행 ≈ ~80MB

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PREFIX = 'LOADTEST_';
const BATCH = 50;

function fmt(b: bigint | number): string {
  const n = Number(b);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function dbSize(): Promise<number> {
  const r = await prisma.$queryRaw<{ size: bigint }[]>`
    SELECT pg_database_size(current_database()) AS size
  `;
  return Number(r[0].size);
}

async function tableCount(table: string): Promise<number> {
  // dynamic table name — quote 처리.
  const r = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) AS count FROM "${table}"`
  );
  return Number(r[0].count);
}

async function tableStats() {
  const tables = ['users', 'products', 'posts', 'comments', 'messages', 'chat_rooms', 'reviews', 'point_transactions', 'snow_runs', 'user_coupons'];
  const results: { table: string; count: number }[] = [];
  for (const t of tables) {
    try {
      results.push({ table: t, count: await tableCount(t) });
    } catch {
      results.push({ table: t, count: -1 });
    }
  }
  return results;
}

const KOREAN_BRANDS = ['살로몬', '아토믹', '로시뇰', '피셔', '헤드', 'K2', '뵐클', '엘란'];
const SUBCATEGORIES = ['ski', 'board', 'ski_boots', 'board_boots', 'binding', 'wear', 'pole', 'helmet', 'goggles', 'gloves'];
const POST_CATEGORIES = ['free', 'tip', 'review', 'resort'];

async function ensureLoadTestUser(idx: number): Promise<string> {
  const email = `${PREFIX}user${idx}@example.com`;
  const phone = `010${String(Date.now()).slice(-6)}${String(idx).padStart(2, '0')}`.slice(0, 11);
  const password = await bcrypt.hash('LoadTest123!', 10);
  const u = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password,
      name: `${PREFIX}NAME_${idx}`,
      nickname: `LT${idx}`,
      phone,
      phoneVerified: true,
    },
    update: {},
    select: { id: true },
  });
  return u.id;
}

async function seedUser(userId: string, idx: number) {
  // 1) 중고매물 5개
  const products = Array.from({ length: 5 }, (_, j) => ({
    name: `${PREFIX}매물${idx}-${j} ${KOREAN_BRANDS[j % KOREAN_BRANDS.length]} ${170 + j * 5}cm`,
    brand: KOREAN_BRANDS[j % KOREAN_BRANDS.length],
    subcategory: SUBCATEGORIES[j % SUBCATEGORIES.length],
    price: 100000 + Math.floor(Math.random() * 800000),
    image: '/uploads/test.jpg',
    images: '/uploads/test.jpg,/uploads/test2.jpg',
    category: 'used',
    description:
      `상태 양호. 시즌 ${idx}년차 사용. 흠집 적음. 직거래 가능 지역: 평창/홍천. ` +
      `튜닝 1회 완료. 왁싱 매 시즌 진행. `.repeat(2),
    condition: ['상', '중', '하'][j % 3],
    usageCount: `${10 + j * 5}일`,
    length: `${170 + j * 5}cm`,
    userId,
    vertical: 'snow',
    status: ['selling', 'reserved', 'sold'][j % 3],
  }));
  await prisma.product.createMany({ data: products });

  // 2) 커뮤글 3개
  const posts = Array.from({ length: 3 }, (_, j) => ({
    title: `${PREFIX}글${idx}-${j} 시즌권 사용 후기`,
    content:
      `안녕하세요 ${idx}번 유저입니다. ` +
      `용평/하이원/비발디 시즌권 비교 후기. `.repeat(20) +
      `결론: 본인 거주지/주력 슬로프 고려해서 결정하세요.`,
    category: POST_CATEGORIES[j % POST_CATEGORIES.length],
    sport: j % 2 === 0 ? 'ski' : 'board',
    userId,
    vertical: 'snow',
  }));
  await prisma.post.createMany({ data: posts });

  // 3) 포인트 거래 5건 (가입 보너스는 이미 있으므로 추가 5건)
  let balance = 1000;
  const pointTxs = Array.from({ length: 5 }, (_, j) => {
    const amount = j % 2 === 0 ? 100 + j * 50 : -(50 + j * 30);
    balance += amount;
    return {
      userId,
      amount,
      balanceAfter: balance,
      source: ['snow_run', 'review', 'coupon_purchase', 'daily_checkin', 'referral_bonus'][j],
      description: `${PREFIX}거래 ${j}`,
    };
  });
  await prisma.pointTransaction.createMany({ data: pointTxs });
}

async function pairChatAndReview(userAId: string, userBId: string, idx: number) {
  // 채팅방 1개 + 메시지 10개
  const [u1, u2] = [userAId, userBId].sort();
  const room = await prisma.chatRoom.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    create: { user1Id: u1, user2Id: u2 },
    update: {},
    select: { id: true },
  });
  const msgs = Array.from({ length: 10 }, (_, j) => ({
    roomId: room.id,
    senderId: j % 2 === 0 ? userAId : userBId,
    content: `${PREFIX}메시지${idx}-${j}: 안녕하세요 매물 보고 연락드립니다. 거래 가능한가요?`,
    type: 'text',
  }));
  await prisma.message.createMany({ data: msgs });
}

async function fill(targetUsers: number) {
  const start = await dbSize();
  console.log(`\n🚀 부하 테스트 시작 (목표 ${targetUsers}명)`);
  console.log(`시작 DB: ${fmt(start)}\n`);

  // 기존 LOADTEST_ 사용자 카운트
  const existing = await prisma.user.count({ where: { email: { startsWith: PREFIX } } });
  console.log(`기존 LOADTEST_ 사용자: ${existing}명\n`);

  const startIdx = existing;
  for (let i = 0; i < targetUsers; i += BATCH) {
    const batchEnd = Math.min(i + BATCH, targetUsers);
    const userIds: string[] = [];
    for (let j = i; j < batchEnd; j++) {
      const idx = startIdx + j;
      try {
        const id = await ensureLoadTestUser(idx);
        userIds.push(id);
        await seedUser(id, idx);
      } catch (e) {
        console.error(`  유저 ${idx} 실패:`, (e as Error).message.slice(0, 100));
      }
    }
    // 채팅 페어링 (홀짝)
    for (let k = 0; k < userIds.length - 1; k += 2) {
      try {
        await pairChatAndReview(userIds[k], userIds[k + 1], startIdx + i + k);
      } catch {}
    }
    const now = await dbSize();
    console.log(
      `  ${batchEnd}/${targetUsers} 명 처리 — DB: ${fmt(now)} (+${fmt(now - start)})`
    );
  }

  console.log('\n📊 최종 테이블별 행수');
  for (const r of await tableStats()) {
    console.log(`  ${r.table.padEnd(22)} ${r.count.toLocaleString()}`);
  }

  const end = await dbSize();
  console.log(`\n시작 → 종료: ${fmt(start)} → ${fmt(end)} (증가 ${fmt(end - start)})`);
  console.log(`유저당 평균 증가: ${fmt((end - start) / targetUsers)}`);
}

async function measure() {
  const size = await dbSize();
  console.log(`📦 현재 DB 사이즈: ${fmt(size)}\n`);
  console.log('📊 테이블별 행수');
  for (const r of await tableStats()) {
    console.log(`  ${r.table.padEnd(22)} ${r.count.toLocaleString()}`);
  }
  const limits = [
    { name: 'Supabase Free', bytes: 500 * 1024 ** 2 },
    { name: 'Supabase Pro', bytes: 8 * 1024 ** 3 },
    { name: 'Neon Free', bytes: 3 * 1024 ** 3 },
    { name: 'Render PG Free', bytes: 256 * 1024 ** 2 },
    { name: 'Render PG Starter', bytes: 1024 ** 3 },
  ];
  console.log('\n🎯 한도별 사용률');
  for (const l of limits) {
    const used = (size / l.bytes) * 100;
    const flag = used > 80 ? '🔴' : used > 50 ? '🟡' : '🟢';
    console.log(`  ${flag} ${l.name.padEnd(20)} ${used.toFixed(1)}%`);
  }
}

async function cleanup() {
  const start = await dbSize();
  console.log(`\n🧹 LOADTEST_ 데이터 삭제 시작`);
  console.log(`시작 DB: ${fmt(start)}\n`);

  // 외래키 의존성 역순으로 삭제.
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  console.log(`대상 사용자: ${userIds.length}명`);

  if (userIds.length === 0) {
    console.log('삭제할 LOADTEST_ 데이터 없음');
    return;
  }

  const where = { userId: { in: userIds } };
  const r1 = await prisma.message.deleteMany({ where: { senderId: { in: userIds } } });
  console.log(`  messages: ${r1.count}`);
  const r2 = await prisma.chatRoom.deleteMany({
    where: { OR: [{ user1Id: { in: userIds } }, { user2Id: { in: userIds } }] },
  });
  console.log(`  chat_rooms: ${r2.count}`);
  const r3 = await prisma.pointTransaction.deleteMany({ where });
  console.log(`  point_transactions: ${r3.count}`);
  const r4 = await prisma.post.deleteMany({ where });
  console.log(`  posts: ${r4.count}`);
  const r5 = await prisma.product.deleteMany({ where });
  console.log(`  products: ${r5.count}`);
  const r6 = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`  users: ${r6.count}`);

  const end = await dbSize();
  console.log(`\n종료 DB: ${fmt(end)} (회수 ${fmt(start - end)})`);
}

async function main() {
  const cmd = process.argv[2];
  const count = parseInt(process.argv[3] || '100', 10);

  if (cmd === 'fill') await fill(count);
  else if (cmd === 'measure') await measure();
  else if (cmd === 'cleanup') await cleanup();
  else {
    console.log(`
사용법:
  npx tsx prisma/load-test.ts fill <N>     # N명 분량 부하 채우기
  npx tsx prisma/load-test.ts measure      # 현재 사이즈 측정
  npx tsx prisma/load-test.ts cleanup      # LOADTEST_ 데이터 삭제

예:
  npx tsx prisma/load-test.ts fill 100     # 100명 → ~8MB
  npx tsx prisma/load-test.ts fill 1000    # 1000명 → ~80MB
  npx tsx prisma/load-test.ts fill 10000   # 10000명 → ~800MB (한도 체크)
`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
