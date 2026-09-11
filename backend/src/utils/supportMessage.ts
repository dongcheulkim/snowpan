// 고객센터(관리자) 이름으로 특정 회원에게 1:1 채팅 메시지를 먼저 보내기 — 등록 거부 사유 전달 등.
// 방은 /contact/admin-id 와 같은 "첫 관리자" 기준으로 잡아, 손님이 고객센터 1:1 을 열었을 때와 같은 방을 쓴다
// (공용 받은편지함이라 어느 관리자든 이어서 답할 수 있음).
import prisma from '../config/database';
import { emitToRoom, emitToUser } from '../realtime';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from './push';

export async function sendSupportMessage(userId: string, content: string): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, nickname: true, profileImage: true },
  });
  if (!admin || admin.id === userId) return null;
  const [u1, u2] = [admin.id, userId].sort();
  const room = await prisma.chatRoom.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    create: { user1Id: u1, user2Id: u2, status: 'accepted' },
    // 요청 대기/거절 상태였어도 관리자가 먼저 말을 걸면 대화 가능 상태로
    update: { status: 'accepted', requestedBy: null },
  });
  const message = await prisma.message.create({ data: { roomId: room.id, senderId: admin.id, content, type: 'text' } });
  emitToRoom(room.id, 'new_message', {
    ...message,
    sender: { id: admin.id, name: admin.nickname || admin.name, nickname: admin.nickname, profileImage: admin.profileImage },
  });
  const preview = content.length > 30 ? content.slice(0, 30) + '...' : content;
  await createNotification(userId, 'chat', '고객센터 메시지', preview, `/chat/${room.id}`).catch(() => {});
  emitToUser(userId, 'new_notification', { type: 'chat', title: '고객센터 메시지', message: preview });
  sendPushToUser(userId, '고객센터 메시지', preview, `/chat/${room.id}`).catch(() => {});
  return room.id;
}

// 거부 사유 입력값 정리 — 문자열만, 앞뒤 공백 제거, 500자 제한
export function cleanReason(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 500) : '';
}

// 등록 거부 채팅 문구 — 사유와 함께 "보완해서 다시 등록" 안내
export function rejectChatText(kind: string, name: string, reason: string): string {
  return `[등록 거부] ${kind} '${name}'\n사유: ${reason}\n\n내용을 보완해서 다시 등록해 주시면 빠르게 확인해 드릴게요. 궁금한 점은 이 채팅으로 물어봐 주세요.`;
}

// 알림 본문 — 기본 문구 뒤에 사유를 붙임
export function withReason(base: string, reason: string): string {
  return reason ? `${base} 사유: ${reason}` : base;
}
