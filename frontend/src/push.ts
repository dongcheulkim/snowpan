// Capacitor 네이티브 앱 전용 FCM 푸시 등록. 웹 브라우저에서는 아무것도 하지 않음.
// 흐름: 권한요청 → register() → 'registration' 이벤트로 FCM 토큰 수신 → 백엔드 저장(/auth/fcm-token).
//       알림 탭 시 data.link 로 이동.
import { Capacitor } from '@capacitor/core';
import { api, getUser } from './api';

let started = false;

export async function initPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // 웹 no-op
  if (!getUser()) return;                     // 로그인 유저만 (토큰 저장 API 가 인증 필요)
  if (started) return;                        // 중복 리스너 방지
  started = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // 안드로이드 알림 채널 — 백엔드가 channelId 'default' 로 발송하므로 미리 생성.
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'default',
        name: '스노우판 알림',
        description: '채팅·거래·커뮤니티 알림',
        importance: 5, // MAX — 헤드업 표시
        visibility: 1, // PUBLIC
      }).catch(() => {});
    }

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') { started = false; return; }

    await PushNotifications.removeAllListeners();

    // FCM 토큰 수신 → 백엔드 저장
    await PushNotifications.addListener('registration', (t) => {
      api('/auth/fcm-token', { method: 'POST', body: { fcmToken: t.value } }).catch(() => {});
    });
    await PushNotifications.addListener('registrationError', () => { /* 무시 */ });

    // 알림 탭 → 해당 링크로 이동 (data.link)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = (action.notification.data as { link?: string })?.link;
      if (link && typeof link === 'string' && link.startsWith('/')) {
        window.location.href = link;
      }
    });

    await PushNotifications.register();
  } catch {
    started = false; // 실패 시 재시도 허용
  }
}

// 로그아웃 시 이 기기의 리스너 해제 (서버 토큰 정리는 api.ts logout 에서 best-effort).
export async function clearPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  started = false;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners().catch(() => {});
  } catch { /* 무시 */ }
}
