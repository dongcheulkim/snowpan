import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  // Apply saved dark mode preference on mount
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // FCM token stub: request notification permission and log token placeholder
  useEffect(() => {
    // Firebase Cloud Messaging stub
    // To enable push notifications:
    // 1. Install firebase: npm install firebase
    // 2. Initialize Firebase with your config
    // 3. Replace the stub below with actual FCM token retrieval
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('[FCM Stub] Notification permission granted. Set up Firebase to get the FCM token.');
          // TODO: Get FCM token and POST to /api/auth/fcm-token
          // import { getMessaging, getToken } from 'firebase/messaging';
          // const messaging = getMessaging(firebaseApp);
          // const fcmToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
          // await api('/auth/fcm-token', { method: 'POST', body: { fcmToken } });
        }
      }).catch(() => { /* ignore */ });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
