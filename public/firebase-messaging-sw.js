
// @ts-nocheck
/*
 * Service Worker لاستقبال إشعارات Firebase في الخلفية.
 * هذا الملف ضروري لضمان وصول الرسائل حتى والموقع مغلق.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ملاحظة: سيتم تعويض القيم أدناه آلياً من Firebase Config عند التشغيل
firebase.initializeApp({
  apiKey: "AIzaSyDE6OjDwFXbhWglSvSO7hnSowz-no6dfTM",
  authDomain: "studio-8343614197-d2c5b.firebaseapp.com",
  projectId: "studio-8343614197-d2c5b",
  storageBucket: "studio-8343614197-d2c5b.firebasestorage.app",
  messagingSenderId: "957726027171",
  appId: "1:957726027171:web:71faad5711fc0138113e16"
});

const messaging = firebase.messaging();

// معالجة الإشعارات عند وصولها في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/favicon.ico',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || '/dashboard/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كان الموقع مفتوحاً بالفعل، قم بتنشيطه
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // إذا لم يكن مفتوحاً، افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
