/**
 * Push Notification 유틸리티 (FCM 스텁)
 *
 * Firebase Cloud Messaging을 사용하여 푸시 알림을 보내기 위해서는:
 * 1. Firebase 프로젝트 생성 (https://console.firebase.google.com)
 * 2. 서비스 계정 키 JSON 파일을 다운로드
 * 3. FIREBASE_SERVICE_ACCOUNT 환경변수에 경로 설정
 * 4. firebase-admin 패키지 설치: npm install firebase-admin
 * 5. 아래 initializeFirebase() 주석 해제 후 실제 구현
 *
 * 현재는 콘솔 로그로 대체됩니다.
 */

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * 푸시 알림 전송 스텁
 * Firebase 설정이 완료되면 실제 FCM 전송으로 교체하세요.
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload
): Promise<boolean> {
  // Firebase 설정 전까지는 로그만 출력
  console.log('[FCM Stub] 푸시 알림 전송 대기:', {
    token: fcmToken.slice(0, 20) + '...',
    title: payload.title,
    body: payload.body,
  });

  // TODO: Firebase 설정 후 아래 코드로 교체
  // import * as admin from 'firebase-admin';
  // const message: admin.messaging.Message = {
  //   token: fcmToken,
  //   notification: { title: payload.title, body: payload.body },
  //   data: payload.data,
  // };
  // await admin.messaging().send(message);

  return true;
}
