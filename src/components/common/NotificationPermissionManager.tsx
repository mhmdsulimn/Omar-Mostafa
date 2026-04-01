'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';

/**
 * مكون إدارة تصاريح الإشعارات المطور:
 * يضمن تسجيل الـ Service Worker وحفظ الـ Token في ملف المستخدم بدقة.
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
    
    // ملاحظة: لكي يعمل الإرسال الفعلي، يجب تحديث VAPID Key من Firebase Console
    const vapidKey = 'BD6Py_X_vX_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z';

    initialized.current = true;
    
    const services = initializeFirebase();
    const messaging = services.messaging;
    if (!messaging) return;

    // استقبال الرسائل والموقع مفتوح في تبويب نشط
    onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title || '🔔 تنبيه جديد',
        description: payload.notification?.body,
      });
    });

    const setupNotifications = async () => {
      try {
        // 1. تسجيل ملف الـ Service Worker (المحرك)
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging-push-scope'
        });
        await navigator.serviceWorker.ready;

        // 2. طلب إذن الإشعارات من المتصفح
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // 3. استخراج رمز الجهاز الفريد (FCM Token)
          const fcmToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration
          });
          
          if (fcmToken) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const existingTokens = userDoc.data()?.fcmTokens || [];
                
                // 4. حفظ الرمز في قاعدة البيانات إذا لم يكن موجوداً مسبقاً
                if (!existingTokens.includes(fcmToken)) {
                  await updateDoc(userDocRef, {
                      fcmTokens: arrayUnion(fcmToken)
                  });
                  console.log("Device Token synchronized successfully.");
                }
            }
          }
        }
      } catch (error) {
        // تنبيه صامت في الكونسول لأن بعض المتصفحات تمنع الإشعارات في بيئة التطوير
        console.warn("Notification Setup Notice: Use HTTPS and VAPID Key for active push notifications.");
      }
    };

    // تأخير طفيف لضمان استقرار الصفحة قبل طلب الإذن
    const timer = setTimeout(setupNotifications, 4000);
    return () => clearTimeout(timer);

  }, [user?.uid, firestore, toast]);

  return null;
}
