// Firebase Cloud Messaging Service Worker
// FIREBASE_CONFIG 환경변수 설정 후 활성화
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
  projectId: self.__FIREBASE_CONFIG__?.projectId || '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (title) {
    self.registration.showNotification(title, {
      body: body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: payload.data,
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link || '/';
  event.waitUntil(clients.openWindow(url));
});
