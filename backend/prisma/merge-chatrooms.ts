import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 중복 채팅방 병합 시작...');

  // 직접 SQL로 중복 채팅방 처리 (productId가 아직 있는 상태에서)
  // 1. 같은 유저쌍의 중복 방에서 메시지를 가장 오래된 방으로 이동
  await prisma.$executeRawUnsafe(`
    UPDATE messages SET "roomId" = keep.id
    FROM chat_rooms dup
    JOIN (
      SELECT MIN(id) as id, "user1Id", "user2Id"
      FROM chat_rooms
      GROUP BY "user1Id", "user2Id"
    ) keep ON dup."user1Id" = keep."user1Id" AND dup."user2Id" = keep."user2Id"
    WHERE messages."roomId" = dup.id AND dup.id != keep.id
  `);

  // 2. 중복 방 삭제
  const result = await prisma.$executeRawUnsafe(`
    DELETE FROM chat_rooms
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM chat_rooms
      GROUP BY "user1Id", "user2Id"
    )
  `);

  console.log(`✅ 중복 채팅방 ${result}개 삭제 완료`);

  // 3. productId 컬럼이 있으면 null로 설정 (db push에서 드롭 준비)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE chat_rooms DROP COLUMN IF EXISTS "productId"`);
    console.log('✅ productId 컬럼 제거 완료');
  } catch {
    console.log('ℹ️ productId 컬럼이 이미 없음');
  }

  // 4. 기존 유니크 제약 제거 후 새로 추가
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS "chat_rooms_user1Id_user2Id_productId_key"`);
    console.log('✅ 기존 유니크 제약 제거');
  } catch {
    console.log('ℹ️ 기존 유니크 제약이 이미 없음');
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE chat_rooms ADD CONSTRAINT "chat_rooms_user1Id_user2Id_key" UNIQUE ("user1Id", "user2Id")
    `);
    console.log('✅ 새 유니크 제약 추가');
  } catch {
    console.log('ℹ️ 새 유니크 제약이 이미 있음');
  }
}

main()
  .catch(e => { console.error('병합 오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
