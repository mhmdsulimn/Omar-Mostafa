/**
 * @fileOverview Firebase Messaging Service Worker.
 * هذا الملف ضروري جداً لاستقبال الإشعارات الفورية في الخلفية.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// تهيئة فايربيز داخل الـ Service Worker باستخدام إعدادات مشروعك
firebase.initializeApp({
  apiKey: "AIzaSyDE6OjDwFXbhWglSvSO7hnSowz-no6dfTM",
  authDomain: "studio-8343614197-d2c5b.firebaseapp.com",
  projectId: "studio-8343614197-d2c5b",
  storageBucket: "studio-8343614197-d2c5b.firebasestorage.app",
  messagingSenderId: "957726027171",
  appId: "1:957726027171:web:71faad5711fc0138113e16"
});

const messaging = firebase.messaging();

// التعامل مع الإشعارات التي تصل والموقع مغلق
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || '🔔 تنبيه من منصة تسلا';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
