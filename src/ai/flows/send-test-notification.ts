'use server';
/**
 * @fileOverview تم تعطيل هذا التدفق لإلغاء نظام الإشعارات.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export async function sendTestNotification(userId: string) {
  return { success: false, message: 'تم تعطيل نظام الإشعارات بناءً على طلب الإدارة.' };
}

ai.defineFlow(
  {
    name: 'sendTestNotificationFlow',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async () => {
    return { success: false, message: 'Feature disabled.' };
  }
);
