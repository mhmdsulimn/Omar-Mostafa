'use server';
/**
 * @fileOverview تم تعطيل إرسال إشعارات الأجهزة عند إنشاء امتحان جديد.
 */

import { ai } from '@/ai/genkit';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { z } from 'zod';

export const notifyNewExamFlow = ai.defineFlow(
  {
    name: 'notifyNewExamFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async () => {
    // تم تعطيل الإرسال.
    return;
  }
);

export const onnewexam = onDocumentCreated('exams/{examId}', async (event) => {
  return;
});
