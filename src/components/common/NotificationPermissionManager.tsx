
'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';

/**
 * مكون إدارة تصاريح الإشعارات المطور:
 * يضمن تسجيل الـ Service Worker وحفظ الـ Token في ملف المستخدم.
 */
export function NotificationPermissionManager() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user || !firestore || initialized.current) {
      return;
    }
    
    // مفتاح VAPID العام (يجب تحديثه من Firebase Console عند النشر النهائي)
    const vapidKey = 'BD6Py_X_vX_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z';

    initialized.current = true;
    
    const services = initializeFirebase();
    const messaging = services.messaging;
    if (!messaging) return;

    // استقبال الرسائل والموقع مفتوح
    onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title || '🔔 تنبيه جديد',
        description: payload.notification?.body,
      });
    });

    const setupNotifications = async () => {
      try {
        // 1. تسجيل ملف الـ Service Worker من المسار العام
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        // 2. طلب إذن الإشعارات
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // 3. استخراج رمز الجهاز
          const fcmToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration
          });
          
          if (fcmToken) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const existingTokens = userDoc.data()?.fcmTokens || [];
                
                // 4. حفظ الرمز في قاعدة البيانات إذا كان جديداً
                if (!existingTokens.includes(fcmToken)) {
                  await updateDoc(userDocRef, {
                      fcmTokens: arrayUnion(fcmToken)
                  });
                  console.log("FCM Token synced with Firestore.");
                }
            }
          }
        }
      } catch (error) {
        console.warn("FCM Setup Notice:", "إعدادات الإشعارات تحتاج لمفتاح VAPID من الكونسول وتوفر HTTPS.");
      }
    };

    // تأخير طفيف لضمان استقرار الصفحة
    const timer = setTimeout(setupNotifications, 3000);
    return () => clearTimeout(timer);

  }, [user, firestore, toast]);

  return null;
}
