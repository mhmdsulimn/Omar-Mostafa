
'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';

/**
 * مكون إدارة تصاريح الإشعارات:
 * 1. يطلب الإذن من الطالب لاستقبال التنبيهات.
 * 2. يقوم بتحديث رمز الجهاز (Token) في قاعدة البيانات لضمان وصول الرسائل.
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
    
    // المفتاح العام من Firebase Console (VAPID Key)
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) {
      console.warn("FCM: Missing NEXT_PUBLIC_VAPID_KEY. Push notifications will not work.");
      return;
    }

    initialized.current = true;
    
    const { messaging } = initializeFirebase();
    if (!messaging) return;

    // استقبال الرسائل والموقع مفتوح (Foreground)
    onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title || 'إشعار جديد',
        description: payload.notification?.body,
      });
    });

    const requestPermissionAndGetToken = async () => {
      try {
        // فحص حالة التصريح الحالية
        let permission = Notification.permission;
        
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
            // تسجيل الـ Service Worker يدوياً لضمان التوافق مع Next.js
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            // انتظار الـ service worker ليكون نشطاً
            await navigator.serviceWorker.ready;

            const fcmToken = await getToken(messaging, { 
              vapidKey,
              serviceWorkerRegistration: registration
            });
            
            if (fcmToken) {
              const userDocRef = doc(firestore, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              const existingTokens = userDoc.data()?.fcmTokens || [];
              
              if (!existingTokens.includes(fcmToken)) {
                await updateDoc(userDocRef, {
                    fcmTokens: arrayUnion(fcmToken)
                });
                console.log("FCM Token synced with Firestore.");
                toast({ title: 'تم تفعيل الإشعارات', description: 'جهازك الآن جاهز لاستقبال تنبيهات المنصة.' });
              }
            }
        } else if (permission === 'denied') {
            console.warn("FCM: User denied notification permission.");
        }
      } catch (error) {
        console.error("FCM: Permission or Token error", error);
      }
    };

    // تأخير الطلب قليلاً لضمان تحميل الصفحة بالكامل
    const timer = setTimeout(requestPermissionAndGetToken, 3000);
    return () => clearTimeout(timer);

  }, [user, firestore, toast]);

  return null;
}
