'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';

export function NotificationPermissionManager() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user || !firestore || initialized.current) {
      return;
    }
    
    initialized.current = true;
    
    const { messaging } = initializeFirebase();
    if (!messaging) return;

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
      });
    });

    const requestPermissionAndGetToken = async () => {
      try {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
            console.error("NEXT_PUBLIC_VAPID_KEY is not set in .env file. Push notifications will not work.");
            return;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission was not granted.');
                return;
            }
        }

        if (Notification.permission === 'granted') {
            const fcmToken = await getToken(messaging, { vapidKey });
            
            if (fcmToken) {
              const userDocRef = doc(firestore, 'users', user.uid);
              // Check if token already exists before updating
              const userDoc = await getDoc(userDocRef);
              const existingTokens = userDoc.data()?.fcmTokens || [];
              if (!existingTokens.includes(fcmToken)) {
                await updateDoc(userDocRef, {
                    fcmTokens: arrayUnion(fcmToken)
                });
                console.log('FCM token saved to Firestore.');
                 toast({
                  title: 'تم تفعيل الإشعارات',
                  description: 'ستتلقى الآن إشعارات مهمة على هذا الجهاز.',
                });
              } else {
                 console.log('FCM token already exists for this device.');
              }
            }
        }
      } catch (error) {
        console.error('An error occurred while setting up notifications. ', error);
      }
    };

    requestPermissionAndGetToken();

  }, [user, firestore, toast]);

  return null;
}
