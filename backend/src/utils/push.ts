import prisma from '../config/database';

// 백그라운드 푸시 — 현재 Expo (모바일 앱) 만 활성화.
// 웹 백그라운드 푸시는 Web Push (VAPID) 로 별도 구현 예정.
// 웹 사용자는 탭 열려있을 때 Socket.IO + Browser Notification 으로 알림 수신.
export async function sendPushToUser(userId: string, title: string, body: string, link?: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    const token = user.fcmToken;

    if (token.startsWith('ExponentPushToken')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: 'default',
          data: { link: link || '/' },
        }),
      });
    }
    // 다른 토큰 형식 (구 FCM) 은 무시 — 레거시 FCM HTTP API 는 2024-06 deprecated.
  } catch (error) {
    console.error('Push failed:', error);
  }
}

export async function sendPushToAdmins(title: string, body: string, link?: string): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin', fcmToken: { not: null } }, select: { id: true } });
    for (const admin of admins) {
      await sendPushToUser(admin.id, title, body, link);
    }
  } catch (error) {
    console.error('Admin push failed:', error);
  }
}
