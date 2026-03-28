'use server';
/**
 * @fileOverview A Genkit flow for notifying students about a new exam.
 * This flow is designed to be triggered when a new exam is created in Firestore.
 * It finds students in the grade level and sends them emails and push notifications.
 */

import { ai } from '@/ai/genkit';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { z } from 'zod';
import { Resend } from 'resend';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import type { Student, Exam } from '@/lib/data';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Define the input schema for the flow, which is an Exam object.
const NewExamSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  grade: z.enum(['first_secondary', 'second_secondary', 'third_secondary']),
  allowRetakes: z.boolean(),
});

// Define and export the Genkit flow.
export const notifyNewExamFlow = ai.defineFlow(
  {
    name: 'notifyNewExamFlow',
    inputSchema: NewExamSchema,
    outputSchema: z.void(),
  },
  async (exam) => {
    // This flow requires Firebase Admin SDK to be initialized.
    // This happens automatically in the Firebase Functions environment.
    const db = getFirestore();

    // 1. Find all students matching the exam's grade level.
    const studentsSnapshot = await db
      .collection('users')
      .where('grade', '==', exam.grade)
      .get();

    if (studentsSnapshot.empty) {
      console.log(`No students found for grade: ${exam.grade}`);
      return;
    }

    const students = studentsSnapshot.docs.map(doc => doc.data() as Student);

    // 2. Filter for students who have email notifications enabled and send emails.
    const eligibleForEmail = students.filter(
      (student) => student.notificationPreferences?.email === true
    );

    if (eligibleForEmail.length > 0) {
      const emailPromises = eligibleForEmail.map((student) => {
        const studentName = student.firstName || 'طالب';
        return resend.emails.send({
          from: 'Omar Mostafa <onboarding@resend.dev>',
          to: student.email,
          subject: `📝 امتحان جديد متاح: ${exam.title}`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
              <h2>مرحباً ${studentName},</h2>
              <p>تم نشر امتحان جديد يناسب صفك الدراسي!</p>
              <p><strong>تفاصيل الامتحان:</strong></p>
              <ul>
                <li><strong>العنوان:</strong> ${exam.title}</li>
                <li><strong>الوصف:</strong> ${exam.description}</li>
                <li><strong>المدة:</strong> ${exam.duration} دقيقة</li>
              </ul>
              <p>يمكنك الآن تسجيل الدخول إلى المنصة لبدء الاختبار. حظاً موفقاً!</p>
              <br>
              <p>مع تحيات،</p>
              <p>فريق Omar Mostafa</p>
            </div>
          `,
        });
      });

      try {
        await Promise.all(emailPromises);
        console.log(`Successfully sent ${eligibleForEmail.length} emails for new exam: ${exam.title}`);
      } catch (error) {
        console.error('Error sending new exam notification emails:', error);
      }
    }

    // --- 3. Send Push Notifications ---
    const allTokens = students.flatMap(student => student.fcmTokens || []).filter(token => token);
    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length > 0) {
      const message = {
        notification: {
          title: `📝 امتحان جديد: ${exam.title}`,
          body: `تم نشر امتحان جديد يناسب صفك الدراسي. اضغط لتبدأ!`,
        },
        webpush: {
          fcmOptions: {
            link: `/dashboard/exams` // Link to the specific exams page
          }
        },
        tokens: uniqueTokens,
      };

      try {
        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} push notifications.`);
        if (response.failureCount > 0) {
          console.error(`Failed to send ${response.failureCount} push notifications.`);
        }
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }
  }
);

// Define the Cloud Function trigger.
// This function will listen for new documents in the 'exams' collection.
// NOTE: This requires deploying the code to Firebase Functions.
export const onnewexam = onDocumentCreated('exams/{examId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }
  const examData = snapshot.data() as Exam;
  
  // Ensure the API key is available before running the flow.
  if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set. Cannot send notification email.");
  }

  // Invoke the Genkit flow with the new exam data.
  await notifyNewExamFlow(examData);
});
