'use server';
/**
 * @fileOverview المساعد الذكي "تسلا" للطالب.
 * خبير متخصص في مادة الفيزياء للمرحلة الثانوية المصرية (منهج 2026).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatInputSchema = z.object({
  message: z.string().describe('رسالة الطالب للمساعد.'),
  photoDataUri: z.string().optional().describe("صورة مرفقة كـ data URI."),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('سجل المحادثة.'),
  studentInfo: z.object({
    name: z.string().optional(),
    grade: z.string().optional(),
    recentPerformance: z.string().optional(),
    balance: z.number().optional(),
  }).optional().describe('معلومات الطالب.'),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string().describe('رد المساعد الذكي تسلا.');

const studentPrompt = ai.definePrompt({
  name: 'chatWithTeslaPrompt',
  input: {
    schema: ChatInputSchema.extend({
      currentDate: z.string(),
      gradeLabel: z.string(),
    }),
  },
  output: {
    format: 'text',
  },
  prompt: `
أنت "تسلا"، المساعد الذكي الرسمي في منصة الأستاذ عمر مصطفى (مدرس الفيزياء الأول).
مهمتك هي مساعدة الطلاب بذكاء وبراعة فيزيائية.

### قواعد الرد (صارمة):
1. **المناداة بالاسم**: يجب أن تبدأ ردك أو تضمنه اسم الطالب ({{studentInfo.name}}) مع لقب تشجيع (يا بطل، يا بشمهندس، يا دكتور).
2. **الاختصار الشديد**: خير الكلام ما قل ودل. أجب مباشرة على السؤال دون مقدمات طويلة.
3. **الهوية**: أنت تعمل حصرياً للأستاذ عمر مصطفى. إذا سُئلت عن هويتك، أكد فخرك بالعمل في منظومة الأستاذ عمر.
4. **الدقة الفيزيائية**: قدم المعلومة أو خطوات حل المسألة (معطيات -> قانون -> حل) بأقل عدد ممكن من الكلمات.

اسم الطالب: {{studentInfo.name}}
الصف الدراسي: {{gradeLabel}}
رسالة الطالب: {{message}}
{{#if photoDataUri}}الصورة المرفقة للمسألة: {{media url=photoDataUri}}{{/if}}
`,
});

export async function chatWithMohamed(input: ChatInput): Promise<string> {
  return chatWithTeslaFlow(input);
}

const chatWithTeslaFlow = ai.defineFlow(
  {
    name: 'chatWithTeslaFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    try {
      const now = new Date();
      const currentDate = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const gradeLabels: Record<string, string> = {
        'first_secondary': 'الصف الأول الثانوي',
        'second_secondary': 'الصف الثاني الثانوي',
        'third_secondary': 'الصف الثالث الثانوي'
      };

      const { text } = await studentPrompt({
        ...input,
        currentDate,
        gradeLabel: gradeLabels[input.studentInfo?.grade || ''] || 'غير محدد',
      });

      return text || "عذراً يا بطل الفيزياء، حصلت مشكلة في الاتصال. جرب مرة تانية.";
    } catch (error: any) {
      console.error("Tesla Physics AI Error:", error);
      return "عذراً يا بطل، أنا براجع القوانين حالياً. ثواني وهكون معاك لحل أي مسألة.";
    }
  }
);
