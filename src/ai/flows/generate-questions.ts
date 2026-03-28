'use server';
/**
 * @fileOverview تدفق توليد أسئلة الفيزياء الذكي للامتحانات.
 * يقوم بإنشاء أسئلة فيزياء مطابقة للمنهج المصري بناءً على مدخلات الأستاذ عمر مصطفى.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateQuestionsInputSchema = z.object({
  grade: z.enum(['first_secondary', 'second_secondary', 'third_secondary']),
  topic: z.string().describe('الموضوع المطلوب (مثلاً: قانون أوم، الحركة الدائرية)'),
  count: z.number().min(1).max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  curriculumContext: z.any().optional().describe('بيانات المنهج من الدستور لضمان الدقة.'),
});

export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GeneratedQuestionSchema = z.object({
  text: z.string().describe('نص السؤال باللغة العربية (يشمل الأرقام والقوانين).'),
  option1: z.string().describe('الاختيار الأول.'),
  option2: z.string().describe('الاختيار الثاني.'),
  option3: z.string().describe('الاختيار الثالث.'),
  option4: z.string().describe('الاختيار الرابع.'),
  correctAnswer: z.enum(['option1', 'option2', 'option3', 'option4']).describe('مفتاح الإجابة الصحيحة.'),
  points: z.number().describe('الدرجة المقترحة.'),
  explanation: z.string().optional().describe('خطوات الحل بالتفصيل باللغة العربية.'),
});

const GenerateQuestionsOutputSchema = z.array(GeneratedQuestionSchema);

export async function generateAIQuestions(input: GenerateQuestionsInput) {
  return generateQuestionsFlow(input);
}

const generatePrompt = ai.definePrompt({
  name: 'generatePhysicsQuestionsPrompt',
  input: {
    schema: GenerateQuestionsInputSchema,
  },
  output: {
    schema: GenerateQuestionsOutputSchema,
  },
  prompt: `
أنت "خبير وضع امتحانات الفيزياء" لمنصة الأستاذ عمر مصطفى.
مهمتك هي توليد {{count}} سؤال اختيار من متعدد (MCQ) لموضوع "{{topic}}" للصف {{grade}}.

### معايير التوليد الصارمة:
1. **الصعوبة**: المستوى المطلوب هو "{{difficulty}}".
2. **الواقعية**: محاكاة أسئلة الوزارة و "بنك المعرفة المصري" و "نجوى ليميتد".
3. **الدقة العلمية**: تأكد من صحة الأرقام الفيزيائية والنتائج الرياضية.
4. **التنوع**: نوع بين أسئلة نظرية (مفاهيم) ومسائل حسابية (تطبيق).
5. **الخيارات**: يجب أن تكون المشتتات (Distractors) منطقية ومبنية على أخطاء حسابية شائعة.

أجب بتنسيق JSON يحتوي على قائمة بالأسئلة كما هو محدد.
`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await generatePrompt(input);
      if (!output) throw new Error("فشل الذكاء الاصطناعي في توليد الأسئلة الفيزيائية.");
      return output;
    } catch (error) {
      console.error("AI Physics Generation Error:", error);
      throw error;
    }
  }
);
