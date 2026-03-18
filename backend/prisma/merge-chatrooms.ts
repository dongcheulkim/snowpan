import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 중복 채팅방 병합 시작...');

  try {
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
    console.log('✅ 메시지 이동 완료');
  } catch (e) {
    console.log('ℹ️ 메시지 이동 스킵:', (e as Error).message?.slice(0, 100));
  }

  try {
    // 2. 중복 방 삭제
    await prisma.$executeRawUnsafe(`
      DELETE FROM chat_rooms
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM chat_rooms
        GROUP BY "user1Id", "user2Id"
      )
    `);
    console.log('✅ 중복 채팅방 삭제 완료');
  } catch (e) {
    console.log('ℹ️ 중복 삭제 스킵:', (e as Error).message?.slice(0, 100));
  }

  try {
    // 3. productId 컬럼 제거
    await prisma.$executeRawUnsafe(`ALTER TABLE chat_rooms DROP COLUMN IF EXISTS "productId"`);
    console.log('✅ productId 컬럼 제거 완료');
  } catch (e) {
    console.log('ℹ️ productId 제거 스킵:', (e as Error).message?.slice(0, 100));
  }

  try {
    // 4. 기존 유니크 제약 제거
    await prisma.$executeRawUnsafe(`ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS "chat_rooms_user1Id_user2Id_productId_key"`);
    console.log('✅ 기존 유니크 제약 제거');
  } catch (e) {
    console.log('ℹ️ 기존 제약 스킵:', (e as Error).message?.slice(0, 100));
  }

  try {
    // 5. 새 유니크 제약 추가
    await prisma.$executeRawUnsafe(`
      ALTER TABLE chat_rooms ADD CONSTRAINT "chat_rooms_user1Id_user2Id_key" UNIQUE ("user1Id", "user2Id")
    `);
    console.log('✅ 새 유니크 제약 추가');
  } catch (e) {
    console.log('ℹ️ 새 제약 스킵:', (e as Error).message?.slice(0, 100));
  }

  console.log('🔄 채팅방 병합 완료');
}

main()
  .catch(e => console.error('병합 오류:', e))
  .finally(() => prisma.$disconnect());
