/**
 * @fileOverview Firebase Messaging Service Worker.
 * هذا الملف هو المحرك المسؤول عن استقبال إشعارات الـ Push في الخلفية.
 */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// تهيئة الخدمة في الخلفية (يجب مطابقة هذه القيم مع ملف config.ts)
firebase.initializeApp({
  apiKey: "AIzaSyDE6OjDwFXbhWglSvSO7hnSowz-no6dfTM",
  authDomain: "studio-8343614197-d2c5b.firebaseapp.com",
  projectId: "studio-8343614197-d2c5b",
  storageBucket: "studio-8343614197-d2c5b.firebasestorage.app",
  messagingSenderId: "957726027171",
  appId: "1:957726027171:web:71faad5711fc0138113e16"
});

const messaging = firebase.messaging();

// معالج الرسائل التي تصل بينما الموقع مغلق أو في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
