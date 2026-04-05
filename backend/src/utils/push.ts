import prisma from '../config/database';

// Expo Push + FCM 통합 발송
export async function sendPushToUser(userId: string, title: string, body: string, link?: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    const token = user.fcmToken;

    if (token.startsWith('ExponentPushToken')) {
      // Expo Push
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
    } else {
      // FCM (웹 푸시)
      const serverKey = process.env.FCM_SERVER_KEY;
      if (!serverKey) return;
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Authorization': `key=${serverKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          notification: { title, body, icon: '/icons/icon-192.svg' },
          data: { link: link || '/' },
        }),
      });
    }
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
