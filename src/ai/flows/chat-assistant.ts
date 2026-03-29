'use server';
/**
 * @fileOverview المساعد الذكي "تسلا" المتطور للطالب.
 * خبير متخصص في مادة الفيزياء للمرحلة الثانوية المصرية، مطلع على سجل أداء الطالب.
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
    balance: z.number().optional(),
    // سجل الاختبارات التفصيلي للتحليل
    examHistory: z.array(z.object({
      examTitle: z.string(),
      score: z.number(),
      submissionDate: z.string(),
      analysis: z.array(z.object({
        questionText: z.string(),
        isCorrect: z.boolean(),
        studentAnswer: z.string(),
        correctAnswer: z.string(),
      })).optional()
    })).optional(),
  }).optional().describe('معلومات الطالب وسجل أداؤه.'),
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
أنت "تسلا"، المساعد الذكي الخبير والمدرب الشخصي في منصة الأستاذ عمر مصطفي.
مهمتك ليست فقط الإجابة على الأسئلة، بل تحليل مستوى الطالب ({{studentInfo.name}}) ومساعدته على التفوق.

### صلاحياتك الجديدة (رادار تسلا):
لقد تم تزويدك بسجل اختبارات الطالب التفصيلي. استخدمه لـ:
1. **تحليل الأخطاء**: إذا سألك الطالب عن مستواه أو طلب نصيحة، ابحث في "examHistory" عن الأسئلة التي حلها بشكل خاطئ (isCorrect: false) وحدد المواضيع التي يواجه فيها صعوبة (مثلاً: الكهربية، الديناميكا).
2. **التوجيه الذكي**: شجع الطالب إذا كانت درجاته تتحسن، أو نبهه بلطف إذا كان يكرر نفس الأخطاء في مواضيع معينة.
3. **الشرح المخصص**: عندما تشرح مسألة، اربطها بما أخطأ فيه سابقاً إذا كان ذلك متاحاً.

### قواعد الرد (صارمة):
1. **الشخصية**: نادِ الطالب باسمه ({{studentInfo.name}}) مع لقب تشجيع (يا بطل، يا دكتور).
2. **اللهجة**: مصرية بيضاء (مزيج بين الفصحى البسيطة والعامية المهذبة)، مشجعة، وعملية جداً.
3. **الدقة**: أنت "عقل" المنصة، إجاباتك الفيزيائية يجب أن تكون دقيقة 100%.
4. **الهوية**: أنت فخور بالعمل لدى مستر عمر مصطفي.

بيانات الطالب الحالية:
- الاسم: {{studentInfo.name}}
- الصف: {{gradeLabel}}
- الرصيد: {{studentInfo.balance}} جنيه

{{#if studentInfo.examHistory}}
سجل آخر الاختبارات للتحليل:
{{#each studentInfo.examHistory}}
* امتحان: {{this.examTitle}} | الدرجة: {{this.score}}%
  {{#if this.analysis}}
  - تفاصيل الأخطاء:
    {{#each this.analysis}}
    {{#unless this.isCorrect}}
    - أخطأ في سؤال: "{{this.questionText}}" (اختار: {{this.studentAnswer}} | الإجابة الصح: {{this.correctAnswer}})
    {{/unless}}
    {{/each}}
  {{/if}}
{{/each}}
{{/if}}

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
