import { api } from '../api';

// FCM 웹 푸시 설정
// 환경변수: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_SENDER_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_VAPID_KEY

let messaging: any = null;

async function getMessaging() {
  if (messaging) return messaging;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging: getFCM, getToken, onMessage } = await import('firebase/messaging');

    const app = initializeApp({
      apiKey,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });

    messaging = getFCM(app);
    return messaging;
  } catch {
    return null;
  }
}

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

    const fcm = await getMessaging();
    if (!fcm) return;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(fcm, { vapidKey });

    if (token) {
      await api('/auth/fcm-token', { method: 'POST', body: { fcmToken: token } });
    }
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}

export async function setupForegroundMessages(onMessage: (payload: any) => void): Promise<void> {
  try {
    const fcm = await getMessaging();
    if (!fcm) return;

    const { onMessage: onFCMMessage } = await import('firebase/messaging');
    onFCMMessage(fcm, onMessage);
  } catch {}
}
