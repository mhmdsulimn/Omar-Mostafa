/**
 * @fileOverview Firebase Messaging Service Worker.
 * ضروري لاستقبال الإشعارات في الخلفية حتى والمتصفح مغلق.
 */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// نفس إعدادات config.ts الموجودة في المشروع
firebase.initializeApp({
  apiKey: "AIzaSyDE6OjDwFXbhWglSvSO7hnSowz-no6dfTM",
  authDomain: "studio-8343614197-d2c5b.firebaseapp.com",
  projectId: "studio-8343614197-d2c5b",
  storageBucket: "studio-8343614197-d2c5b.firebasestorage.app",
  messagingSenderId: "957726027171",
  appId: "1:957726027171:web:71faad5711fc0138113e16"
});

const messaging = firebase.messaging();

// معالجة الرسالة عند استلامها في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
