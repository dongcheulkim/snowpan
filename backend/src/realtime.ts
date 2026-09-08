// 실시간(소켓) 참조 홀더 — 컨트롤러가 index.ts 를 순환 import 하지 않고
// 특정 유저의 소켓을 끊을 수 있게 io 참조만 얇게 공유.
import type { Server } from 'socket.io';

let ioRef: Server | null = null;

export function setIO(io: Server): void {
  ioRef = io;
}

// 밴/탈퇴 즉시 해당 유저의 열린 소켓을 모두 종료 — 이미 연결된 세션으로 계속 활동하는 것 차단.
export function disconnectUser(userId: string): void {
  if (!ioRef) return;
  try {
    ioRef.in(`user:${userId}`).disconnectSockets(true);
  } catch { /* 소켓 없거나 이미 종료됨 — 무시 */ }
}

// 서버가 만든 메시지(광고 초대 링크 등)를 그 방을 보고 있는 소켓에 바로 전달 — 소켓 핸들러의 new_message 와 같은 모양으로 보낼 것.
export function emitToRoom(roomId: string, event: string, payload: unknown): void {
  if (!ioRef) return;
  try { ioRef.to(`room:${roomId}`).emit(event, payload); } catch { /* 소켓 없음 — 무시 */ }
}
