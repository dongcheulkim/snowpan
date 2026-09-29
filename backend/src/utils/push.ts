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

// FCM 서버 키(FCM_SERVICE_ACCOUNT)가 설정·초기화 가능한 상태인지 — 관리자 푸시 테스트용.
export async function isFcmConfigured(): Promise<boolean> {
  return (await getFcm()) !== null;
}

async function clearToken(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } }).catch(() => {});
}

async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } }).catch(() => 0);
}

// 아이콘 배지를 현재 미읽음 수로 맞춘다 — 알림을 읽거나 지웠을 때 호출. iOS 는 앱이 꺼져 있어도 조용한 푸시(content-available)로 배지만 바뀐다.
// 앱 빌드 없이 지금 1.7 앱에서도 동작. (안드로이드는 배지 개념이 달라 건너뜀, Expo 레거시 토큰도 건너뜀)
export async function syncBadge(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    const token = user?.fcmToken;
    if (!token || token.startsWith('ExponentPushToken')) return;
    const messaging = await getFcm();
    if (!messaging) return;
    const badge = await unreadCount(userId);
    await messaging.send({
      token,
      apns: { payload: { aps: { badge, 'content-available': 1 } }, headers: { 'apns-priority': '5', 'apns-push-type': 'background' } },
      android: { priority: 'normal' },
      data: { badge: String(badge), silent: '1' },
    });
  } catch (err: unknown) {
    const code = String((err as { errorInfo?: { code?: string }; code?: string })?.errorInfo?.code || (err as { code?: string })?.code || '');
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) await clearToken(userId);
  }
}

// 반환값: 발송 결과 (관리자 푸시 테스트 진단용). 일반 호출부는 fire-and-forget 으로 무시해도 무방.
export async function sendPushToUser(userId: string, title: string, body: string, link?: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return { ok: false, detail: 'no-token' };

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
          return { ok: false, detail: 'expo-device-not-registered' };
        }
      } catch { /* 응답 파싱 실패는 무시 */ }
      return { ok: true, detail: 'expo-sent' };
    }

    // Capacitor 안드로이드 앱 — FCM HTTP v1.
    const messaging = await getFcm();
    if (!messaging) return { ok: false, detail: 'fcm-not-configured' }; // 서비스계정 미설정 → 조용히 무시.
    try {
      const msgId = await messaging.send({
        token,
        notification: { title, body },
        data: { link: link || '/' },
        android: {
          priority: 'high',
          notification: { channelId: 'default', sound: 'default' },
        },
        // iOS(APNs 경유): 소리 + 배지(실제 미읽음 수), 앱이 꺼져 있어도 배너로.
        // 배지를 1 로 고정하면 읽어도 아이콘의 1 이 안 사라짐(사장님 신고 2026-09-30) → 미읽음 수를 보내고, 읽으면 syncBadge 로 0 을 보낸다.
        apns: { payload: { aps: { sound: 'default', badge: await unreadCount(userId) } }, headers: { 'apns-priority': '10' } },
      });
      return { ok: true, detail: `fcm-sent:${msgId}` };
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
      return { ok: false, detail: code || String(err).slice(0, 200) };
    }
  } catch (error) {
    console.error('Push failed:', error);
    return { ok: false, detail: String(error).slice(0, 200) };
  }
}

