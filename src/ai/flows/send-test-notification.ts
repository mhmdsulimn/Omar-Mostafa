'use server';
/**
 * @fileOverview تدفق إرسال إشعار تجريبي للمسؤول لاختبار النظام.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const TestNotifInputSchema = z.object({
  userId: z.string().describe('ID المستخدم المراد إرسال الإشعار له.'),
});

export async function sendTestNotification(userId: string) {
  return sendTestNotificationFlow({ userId });
}

const sendTestNotificationFlow = ai.defineFlow(
  {
    name: 'sendTestNotificationFlow',
    inputSchema: TestNotifInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(input.userId).get();
      const tokens = userDoc.data()?.fcmTokens || [];

      const activeTokens = tokens.filter((t: string) => t);
      if (activeTokens.length === 0) {
        return { success: false, message: 'لم يتم العثور على رموز أجهزة مسجلة لهذا الحساب. تأكد من إعطاء إذن الإشعارات في المتصفح.' };
      }

      const message = {
        notification: {
          title: '🚀 إشعار تجريبي من تسلا',
          body: 'مبروك! نظام الإشعارات يعمل بنجاح على جهازك.',
        },
        webpush: {
          fcmOptions: {
            link: '/admin/dashboard'
          }
        },
        tokens: activeTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      
      if (response.successCount > 0) {
        return { success: true, message: `تم إرسال الإشعار بنجاح إلى ${response.successCount} جهاز.` };
      } else {
        return { success: false, message: 'فشل الإرسال. قد تكون الرموز المخزنة منتهية الصلاحية.' };
      }
    } catch (error: any) {
      console.error('Test Notification Error:', error);
      return { success: false, message: 'حدث خطأ تقني أثناء الإرسال.' };
    }
  }
);
