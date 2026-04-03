import prisma from '../config/database';

// FCM 서버 푸시 발송
// 환경변수: FCM_SERVER_KEY (Firebase 콘솔 → 프로젝트 설정 → Cloud Messaging → 서버 키)

export async function sendPushToUser(userId: string, title: string, body: string, link?: string): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.fcmToken,
        notification: { title, body, icon: '/icons/icon-192.svg' },
        data: { link: link || '/' },
      }),
    });
  } catch (error) {
    console.error('FCM push failed:', error);
  }
}

export async function sendPushToAdmins(title: string, body: string, link?: string): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return;

  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin', fcmToken: { not: null } }, select: { fcmToken: true } });
    for (const admin of admins) {
      if (!admin.fcmToken) continue;
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Authorization': `key=${serverKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: admin.fcmToken,
          notification: { title, body, icon: '/icons/icon-192.svg' },
          data: { link: link || '/admin' },
        }),
      });
    }
  } catch (error) {
    console.error('FCM admin push failed:', error);
  }
}
