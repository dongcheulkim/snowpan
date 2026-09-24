// 알림 한 번에: DB 알림 + 접속 중이면 소켓 토스트 + 푸시 (실패해도 호출부를 막지 않음)
import { createNotification } from '../controllers/notificationController';
import { emitToUser } from '../realtime';
import { sendPushToUser } from './push';

export function notifyUser(userId: string, title: string, message: string, link: string, type: string = 'system'): void {
  createNotification(userId, type, title, message, link).catch(() => {});
  emitToUser(userId, 'new_notification', { type, title, message, link });
  sendPushToUser(userId, title, message, link).catch(() => {});
}
