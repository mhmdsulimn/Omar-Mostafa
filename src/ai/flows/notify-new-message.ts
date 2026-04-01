
'use server';
/**
 * @fileOverview تدفق إرسال الإشعارات الفورية للرسائل الخاصة والإعلانات العامة.
 * يتم تفعيله تلقائياً عند إضافة سجل جديد في Firestore.
 */

import { ai } from '@/ai/genkit';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// --- إرسال إشعار للرسائل الخاصة ---
export const onNotificationCreated = onDocumentCreated('users/{userId}/notifications/{id}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notif = snapshot.data();
  const userId = event.params.userId;

  // استخراج بيانات الطالب لجلب رموز الأجهزة
  const db = getFirestore();
  const studentDoc = await db.collection('users').doc(userId).get();
  const tokens = studentDoc.data()?.fcmTokens || [];

  const activeTokens = tokens.filter((t: string) => t);
  if (activeTokens.length === 0) return;

  const message = {
    notification: {
      title: '🔔 رسالة جديدة',
      body: notif.message,
    },
    webpush: {
      fcmOptions: {
        link: notif.link || '/dashboard/notifications'
      }
    },
    tokens: activeTokens,
  };

  try {
    await getMessaging().sendEachForMulticast(message);
    console.log(`Sent private notification to user: ${userId}`);
  } catch (error) {
    console.error('Error sending private notification:', error);
  }
});

// --- إرسال إشعار للإعلانات العامة ---
export const onAnnouncementCreated = onDocumentCreated('announcements/{id}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const ann = snapshot.data();

  // لا ترسل إذا لم يكن الإعلان نشطاً
  if (!ann.isActive) return;

  const db = getFirestore();
  let studentsQuery: any = db.collection('users');

  // فلترة الطلاب حسب الصف إذا لم يكن الإعلان للكل
  if (ann.targetGrade && ann.targetGrade !== 'all') {
    studentsQuery = studentsQuery.where('grade', '==', ann.targetGrade);
  }

  const studentsSnapshot = await studentsQuery.get();
  const allTokens = studentsSnapshot.docs.flatMap((doc: any) => doc.data().fcmTokens || []).filter((t: string) => t);
  const uniqueTokens = [...new Set(allTokens)];

  if (uniqueTokens.length === 0) return;

  const message = {
    notification: {
      title: '📢 إعلان هام من مستر عمر',
      body: ann.message,
    },
    webpush: {
      fcmOptions: {
        link: '/dashboard/notifications'
      }
    },
    tokens: uniqueTokens,
  };

  try {
    // إرسال الإشعار للكل (مقيد بـ 500 رمز لكل دفعة من FCM)
    for (let i = 0; i < uniqueTokens.length; i += 500) {
      const batch = uniqueTokens.slice(i, i + 500);
      await getMessaging().sendEachForMulticast({ ...message, tokens: batch });
    }
    console.log(`Sent global announcement notification to ${uniqueTokens.length} devices.`);
  } catch (error) {
    console.error('Error sending global notification:', error);
  }
});
