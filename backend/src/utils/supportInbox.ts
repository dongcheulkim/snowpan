// 고객센터 공용 받은편지함 — 관리자 계정이 여럿이어도 손님↔관리자(고객센터) 채팅방은 어느 관리자나 열고 답할 수 있다.
// 방의 참여자는 여전히 "관리자 한 명 + 손님"이지만, 다른 관리자도 그 방을 자기 것처럼 본다(사용자 요청 2026-09-09 "두 곳 다 가게").
// 손님이 보낸 메시지 알림은 관리자 전원에게, 관리자가 보낸 메시지는 손님에게만 간다.
import prisma from '../config/database';

// 캐시 없음 — 관리자는 몇 명 안 되고, 역할이 바뀐 직후(승격·정지) 바로 반영돼야 해서 매번 조회한다(작은 인덱스 없는 스캔이지만 users 가 작다).
export async function getAdminIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  return rows.map((r) => r.id);
}

type RoomLite = { user1Id: string; user2Id: string };

// 관리자 참여자가 있는 방 = 고객센터 방. 어느 쪽(1|2)이 관리자인지 알려준다.
export function adminSideOf(room: RoomLite, adminIds: string[]): 1 | 2 | null {
  if (adminIds.includes(room.user1Id)) return 1;
  if (adminIds.includes(room.user2Id)) return 2;
  return null;
}

// 접근 가능한 방 where — 일반 유저는 자기 방만, 관리자는 자기 방 + 모든 고객센터 방
export async function roomAccessWhere(userId: string, role?: string): Promise<Record<string, unknown>> {
  if (role !== 'admin') return { OR: [{ user1Id: userId }, { user2Id: userId }] };
  const ids = await getAdminIds();
  return { OR: [{ user1Id: userId }, { user2Id: userId }, { user1Id: { in: ids } }, { user2Id: { in: ids } }] };
}

// 이 방에서 viewer 가 "내 쪽"으로 볼 자리 — 참여자면 자기 자리, 관리자가 남의 고객센터 방을 보면 관리자 자리
export function mySideOf(room: RoomLite, userId: string, role: string | undefined, adminIds: string[]): 1 | 2 | null {
  if (room.user1Id === userId) return 1;
  if (room.user2Id === userId) return 2;
  if (role === 'admin') return adminSideOf(room, adminIds);
  return null;
}

// 메시지 수신자 — 관리자가 보내면 손님에게, 손님이 고객센터 방에 보내면 관리자 전원에게
export function recipientsOf(room: RoomLite, senderId: string, adminIds: string[]): string[] {
  const side = adminSideOf(room, adminIds);
  const isSupportRoom = side !== null;
  const senderIsAdmin = adminIds.includes(senderId);
  if (isSupportRoom && senderIsAdmin) {
    const guest = side === 1 ? room.user2Id : room.user1Id;
    return adminIds.includes(guest) ? [guest] : [guest];
  }
  if (isSupportRoom && !senderIsAdmin) return adminIds.filter((id) => id !== senderId);
  return [room.user1Id === senderId ? room.user2Id : room.user1Id];
}
