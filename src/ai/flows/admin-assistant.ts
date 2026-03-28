'use server';
/**
 * @fileOverview المساعد الذكي "تسلا" للأستاذ عمر مصطفى (نسخة المسؤول).
 * مستشار استراتيجي في تعليم الفيزياء وتحليل أداء الطلاب.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AdminChatInputSchema = z.object({
  message: z.string().describe('رسالة الأستاذ عمر للمساعد.'),
  photoDataUri: z.string().optional().describe("صورة مرفقة كـ data URI."),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('سجل المحادثة.'),
  adminInfo: z.object({
    name: z.string().optional(),
    fullData: z.object({
      students: z.array(z.any()).optional(),
      admins: z.array(z.any()).optional(),
      courses: z.array(z.any()).optional(),
      exams: z.array(z.any()).optional(),
      payments: z.array(z.any()).optional(),
      announcements: z.array(z.any()).optional(),
      recentResults: z.array(z.any()).optional(),
      settings: z.any().optional(),
      systemStats: z.object({
        totalBalance: z.number(),
        pendingPaymentsCount: z.number(),
        studentsPerGrade: z.record(z.number()),
      }).optional(),
    }).optional(),
  }).optional(),
});

export type AdminChatInput = z.infer<typeof AdminChatInputSchema>;

const AdminChatOutputSchema = z.object({
  text: z.string().describe('رد المساعد الذكي تسلا.'),
});

const adminPrompt = ai.definePrompt({
  name: 'adminAssistantPrompt',
  input: {
    schema: AdminChatInputSchema.extend({
      currentDate: z.string(),
    }),
  },
  output: {
    format: 'text',
  },
  prompt: `
أنت "تسلا"، المساعد الإداري الذكي للأستاذ عمر مصطفى. مهمتك هي المساعدة في إدارة المنصة وتحليل البيانات بكفاءة.

### ميثاق العمل الإداري:
1. **المناداة الرسمية**: نادِ المستخدم دائماً باسمه ({{adminInfo.name}}) بأسلوب وقور (يا أستاذ، يا بشمهندس).
2. **الإيجاز الإداري**: قدم التحليلات والأجوبة بشكل نقاط مختصرة ومركزة جداً. الأستاذ عمر وقته ثمين.
3. **الولاء للمنصة**: أنت "عقل" منصة الأستاذ عمر مصطفى، ساعده في اتخاذ قرارات مبنية على الأرقام المتاحة في البيانات.

اللهجة: مصرية مهنية، عملية، ومختصرة.

بيانات المنصة للمراجعة: {{adminInfo.fullData.systemStats}}
رسالة المسؤول: {{message}}
`,
});

export async function chatWithAdmin(input: AdminChatInput): Promise<{ text: string }> {
  return chatWithAdminFlow(input);
}

const chatWithAdminFlow = ai.defineFlow(
  {
    name: 'chatWithAdminFlow',
    inputSchema: AdminChatInputSchema,
    outputSchema: AdminChatOutputSchema,
  },
  async (input) => {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const { text } = await adminPrompt({
        ...input,
        currentDate,
      });

      return {
        text: text || "تحت أمرك يا أستاذ عمر، تسلا جاهز للتحليل فوراً.",
      };
    } catch (error: any) {
      console.error("Admin AI Flow Error:", error);
      return { text: "عذراً، حدث خطأ تقني في معالجة البيانات." };
    }
  }
);
