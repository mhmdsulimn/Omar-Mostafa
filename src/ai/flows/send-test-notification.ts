
'use server';
/**
 * @fileOverview تدفق إرسال إشعار تجريبي للمسؤول لاختبار النظام.
 * يوفر رسائل خطأ مفصلة لتسهيل عملية تصحيح الأخطاء في بيئة التطوير.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adminDb } from '@/firebase/admin-services';
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
      // جلب بيانات المستخدم من Admin SDK
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        return { success: false, message: 'لم يتم العثور على ملف المستخدم في قاعدة البيانات.' };
      }

      const tokens = userDoc.data()?.fcmTokens || [];
      const activeTokens = tokens.filter((t: any) => t && typeof t === 'string');

      if (activeTokens.length === 0) {
        return { 
          success: false, 
          message: 'جهازك غير مسجل حالياً. يرجى التأكد من الضغط على "Allow" وتحديث الصفحة ثم الانتظار 5 ثوانٍ.' 
        };
      }

      const message = {
        notification: {
          title: '🚀 اختبار نظام تسلا',
          body: 'مبروك! نظام الإشعارات الفورية يعمل الآن على جهازك بنجاح.',
        },
        webpush: {
          fcmOptions: {
            link: '/admin/dashboard'
          }
        },
        tokens: activeTokens,
      };

      // محاولة إرسال الإشعار لجميع الأجهزة المسجلة لهذا الحساب
      const response = await getMessaging().sendEachForMulticast(message);
      
      if (response.successCount > 0) {
        return { 
          success: true, 
          message: `تم إرسال الإشعار بنجاح إلى ${response.successCount} جهاز متصل بحسابك.` 
        };
      } else {
        const errorDetail = response.responses[0]?.error?.message || 'الرموز المخزنة قد تكون منتهية الصلاحية.';
        return { 
          success: false, 
          message: `فشل الإرسال الفعلي: ${errorDetail}` 
        };
      }
    } catch (error: any) {
      console.error('Test Notification Flow Error:', error);
      return { 
        success: false, 
        message: `خطأ تقني: ${error.message || 'تأكد من إعداد مفاتيح FCM بشكل صحيح.'}` 
      };
    }
  }
);
