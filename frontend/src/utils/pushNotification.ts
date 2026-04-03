import { api } from '../api';

// FCM 웹 푸시 설정
// Firebase 패키지 설치 후 활성화: npm install firebase
// 환경변수: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_SENDER_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_VAPID_KEY

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestPushPermission();
    if (!granted) return;

    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return;

    // @ts-ignore - firebase 패키지 설치 후 사용
    const { initializeApp } = await import('firebase/app');
    // @ts-ignore
    const { getMessaging, getToken } = await import('firebase/messaging');

    const app = initializeApp({
      apiKey,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;

    const token = await getToken(messaging, { vapidKey });
    if (token) {
      await api('/auth/fcm-token', { method: 'POST', body: { fcmToken: token } });
    }
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}
