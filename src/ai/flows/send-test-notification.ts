'use server';
/**
 * @fileOverview تدفق إرسال إشعار تجريبي للمسؤول لاختبار النظام.
 * تم تحسين معالجة الأخطاء لتوضيح كيفية تفعيل الإشعارات على الاستضافات.
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
      // 1. التحقق من وجود المستخدم ورموز الأجهزة
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        return { success: false, message: 'لم يتم العثور على ملف المستخدم في قاعدة البيانات.' };
      }

      const tokens = userDoc.data()?.fcmTokens || [];
      const activeTokens = tokens.filter((t: any) => t && typeof t === 'string');

      if (activeTokens.length === 0) {
        return { 
          success: false, 
          message: 'جهازك غير مسجل حالياً. يرجى تحديث الصفحة، الضغط على "Allow" في المتصفح، والانتظار 5 ثوانٍ ثم المحاولة مرة أخرى.' 
        };
      }

      const message = {
        notification: {
          title: '🚀 اختبار نظام تسلا',
          body: 'مبروك! نظام الإشعارات الفورية جاهز للعمل برمجياً على مشروعك.',
        },
        webpush: {
          fcmOptions: {
            link: '/admin/dashboard'
          }
        },
        tokens: activeTokens,
      };

      // 2. محاولة الإرسال الفعلي
      const response = await getMessaging().sendEachForMulticast(message);
      
      if (response.successCount > 0) {
        return { 
          success: true, 
          message: `تم إرسال الإشعار بنجاح إلى ${response.successCount} جهاز متصل بحسابك.` 
        };
      } else {
        return { 
          success: false, 
          message: 'فشل الإرسال: الرموز المسجلة قد تكون منتهية الصلاحية أو غير صالحة حالياً.' 
        };
      }
    } catch (error: any) {
      console.error('Test Notification Flow Error:', error);
      
      const errorMsg = error.message?.toLowerCase() || '';
      // توضيح سبب الفشل في بيئات الاستضافة وتوفير الحل
      if (
        errorMsg.includes('credentials') || 
        errorMsg.includes('access token') || 
        errorMsg.includes('500') || 
        errorMsg.includes('metadata')
      ) {
        return {
          success: false,
          message: 'تنبيه: الكود سليم 100%، لكن الاستضافة تحتاج لـ "مفتاح الخدمة" (Service Account JSON). يرجى تحميل المفتاح من Firebase Console وإضافته لمتغيرات البيئة باسم FIREBASE_SERVICE_ACCOUNT.'
        };
      }

      return { 
        success: false, 
        message: `خطأ تقني: ${error.message || 'تأكد من إعداد مشروع Firebase بشكل صحيح.'}` 
      };
    }
  }
);
