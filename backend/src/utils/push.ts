import prisma from '../config/database';

// 백그라운드 푸시.
// - Capacitor(안드로이드) 앱: FCM HTTP v1 (firebase-admin). 토큰은 순수 FCM registration token.
// - (레거시) Expo 토큰: ExponentPushToken... 형식. RN 앱 폐기됐지만 호환 유지.
// - 웹: 탭 열려있을 때 Socket.IO + Browser Notification. 웹 백그라운드 푸시(VAPID)는 별도 예정.

// firebase-admin 지연 초기화 — FCM_SERVICE_ACCOUNT env(서비스계정 JSON 문자열) 없으면 비활성(안전).
// 서버는 env 없이도 정상 기동하고, 푸시만 조용히 no-op 됨.
type FcmMessaging = { send: (msg: unknown) => Promise<string> };
// 초기화 Promise 를 공유 — 초기화 중 도착한 동시 발송도 같은 Promise 를 await 해서
// 첫 발송들이 유실되지 않음 (boolean 플래그 방식은 init 창구간의 푸시를 드롭했음).
let fcmInit: Promise<FcmMessaging | null> | null = null;
function getFcm(): Promise<FcmMessaging | null> {
  if (fcmInit) return fcmInit;
  fcmInit = (async () => {
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    if (!raw) return null;
    try {
      // 모듈러 subpath import — 네임스페이스/default interop 회피, 타입 깔끔.
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      const { getMessaging } = await import('firebase-admin/messaging');
      const cred = JSON.parse(raw);
      const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(cred) });
      return getMessaging(app) as unknown as FcmMessaging;
    } catch (e) {
      console.error('FCM(firebase-admin) 초기화 실패:', e);
      return null;
    }
  })();
  return fcmInit;
}

async function clearToken(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } }).catch(() => {});
}

export async function sendPushToUser(userId: string, title: string, body: string, link?: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    const token = user.fcmToken;

    // 레거시 Expo (RN 앱) — 호환 유지.
    if (token.startsWith('ExponentPushToken')) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
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
      // 무효 토큰 (앱 삭제 등) 은 DB 에서 비워 죽은 토큰으로의 영구 재시도 방지.
      try {
        const data = await res.json() as { data?: { status?: string; details?: { error?: string } } };
        if (data?.data?.status === 'error' && data.data.details?.error === 'DeviceNotRegistered') {
          await clearToken(userId);
        }
      } catch { /* 응답 파싱 실패는 무시 */ }
      return;
    }

    // Capacitor 안드로이드 앱 — FCM HTTP v1.
    const messaging = await getFcm();
    if (!messaging) return; // 서비스계정 미설정 → 조용히 무시.
    try {
      await messaging.send({
        token,
        notification: { title, body },
        data: { link: link || '/' },
        android: {
          priority: 'high',
          notification: { channelId: 'default', sound: 'default' },
        },
      });
    } catch (err: unknown) {
      const code = String((err as { errorInfo?: { code?: string }; code?: string })?.errorInfo?.code
        || (err as { code?: string })?.code || '');
      // 무효/만료 토큰 정리 — 죽은 토큰으로의 영구 재시도 방지.
      if (code.includes('registration-token-not-registered')
        || code.includes('invalid-registration-token')
        || code.includes('invalid-argument')) {
        await clearToken(userId);
      } else {
        console.error('FCM send 실패:', code || err);
      }
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
