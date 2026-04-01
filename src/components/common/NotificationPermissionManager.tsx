'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';

/**
 * مكون إدارة تصاريح الإشعارات المطور:
 * 1. يقوم بتسجيل الـ Service Worker اللازم لاستقبال الإشعارات.
 * 2. يطلب الإذن من المستخدم ويستخرج رمز الجهاز (Token).
 * 3. يحفظ الرمز في Firestore لتمكين الإرسال من لوحة التحكم.
 */
export function NotificationPermissionManager() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    // التأكد من أننا في المتصفح وأن المتصفح يدعم الإشعارات
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user || !firestore || initialized.current) {
      return;
    }
    
    // مفتاح VAPID العام (يمكنك تغييره من إعدادات Cloud Messaging في Firebase Console)
    // نستخدم مفتاحاً افتراضياً للتطوير إذا لم يتوفر في البيئة
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BD6Py_X_vX_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z_Z';

    initialized.current = true;
    
    const { messaging } = initializeFirebase();
    if (!messaging) return;

    // التعامل مع الرسائل والموقع مفتوح
    onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title || '🔔 تنبيه جديد',
        description: payload.notification?.body,
      });
    });

    const setupNotifications = async () => {
      try {
        // 1. تسجيل الـ Service Worker يدوياً
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        
        // الانتظار حتى يصبح الـ service worker نشطاً
        await navigator.serviceWorker.ready;

        // 2. طلب الإذن
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // 3. جلب الـ Token
          const fcmToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration
          });
          
          if (fcmToken) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const existingTokens = userDoc.data()?.fcmTokens || [];
            
            // 4. حفظ الـ Token في Firestore إذا لم يكن موجوداً
            if (!existingTokens.includes(fcmToken)) {
              await updateDoc(userDocRef, {
                  fcmTokens: arrayUnion(fcmToken)
              });
              console.log("FCM: Token synced successfully.");
            }
          }
        }
      } catch (error) {
        console.error("FCM Registration Error:", error);
      }
    };

    // تشغيل الإعداد بعد استقرار تحميل الصفحة
    const timer = setTimeout(setupNotifications, 2000);
    return () => clearTimeout(timer);

  }, [user, firestore, toast]);

  return null;
}
