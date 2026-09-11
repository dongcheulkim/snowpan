// 사용자 차단 조회 헬퍼 — 커뮤니티 목록·댓글 숨김, 채팅 차단에 공용.
import prisma from '../config/database';

// 내가 차단한 사용자 id 목록
export async function blockedIdsFor(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
  return rows.map((r) => r.blockedId);
}

// 두 사람 사이에 어느 방향이든 차단이 있는가 (채팅 생성·전송 차단용 — 방향은 노출하지 않음)
export async function isBlockedEither(a: string, b: string): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { id: true },
  });
  return !!row;
}

export const BLOCKED_CHAT_MESSAGE = '차단한 사용자이거나 나를 차단한 사용자와는 대화할 수 없어요.';
