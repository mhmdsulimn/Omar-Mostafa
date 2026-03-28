'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import type { Question, Exam } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Star, CheckCircle, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

type QuestionFormData = Omit<Question, 'id' | 'examId'>;

function QuestionForm({
  question,
  onSave,
  onCancel,
}: {
  question?: Question | null;
  onSave: (data: QuestionFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = React.useState<QuestionFormData>({
    text: question?.text || '',
    option1: question?.option1 || '',
    option2: question?.option2 || '',
    option3: question?.option3 || '',
    option4: question?.option4 || '',
    correctAnswer: question?.correctAnswer || 'option1',
    points: question?.points || 1,
    imageUrl: question?.imageUrl || '',
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleCorrectAnswerChange = (value: string) => {
    setFormData(prev => ({ ...prev, correctAnswer: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const getOptionValue = (key: 'option1' | 'option2' | 'option3' | 'option4') => {
    return formData[key] || '';
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{question ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</CardTitle>
          <CardDescription>
            {question ? 'قم بإجراء تغييرات على تفاصيل السؤال.' : 'املأ تفاصيل السؤال الجديد.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">نص السؤال</Label>
            <Textarea id="text" value={formData.text} onChange={handleChange} required disabled={isSaving} />
          </div>

          <div className="space-y-2">
              <Label htmlFor="imageUrl">رابط الصورة (اختياري)</Label>
              <Input id="imageUrl" value={formData.imageUrl} onChange={handleChange} disabled={isSaving} dir="ltr" placeholder="https://example.com/image.png" className="text-left placeholder:text-left" />
              {formData.imageUrl && (
                  <div className="mt-2 rounded border p-2">
                  <Image src={formData.imageUrl} alt="Preview" width={100} height={100} className="rounded object-cover" />
                  </div>
              )}
          </div>

          <div className="space-y-2">
            <Label>الاختيارات والإجابة الصحيحة</Label>
            <RadioGroup value={formData.correctAnswer} onValueChange={handleCorrectAnswerChange} className="grid gap-2" dir="rtl">
              {(['option1', 'option2', 'option3', 'option4'] as const).map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`r-${opt}`} />
                  <Input id={opt} value={getOptionValue(opt)} onChange={handleChange} placeholder={`الاختيار ${opt.slice(-1)}`} required disabled={isSaving} />
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">درجه السؤال</Label>
            <Input id="points" type="number" value={formData.points} onChange={e => setFormData(prev => ({ ...prev, points: Math.max(1, Number(e.target.value)) }))} required disabled={isSaving} min="1" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>إلغاء</Button>
            <Button type="submit" disabled={isSaving || !formData.text}>
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'جار الحفظ...' : (question ? 'حفظ التغييرات' : 'إنشاء السؤال')}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ManageQuestionsPage() {
  const params = useParams();
  const examId = params.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [viewState, setViewState] = React.useState<{mode: 'list' | 'add' | 'edit', question?: Question}>({ mode: 'list' });
  const [questionToDelete, setQuestionToDelete] = React.useState<Question | null>(null);

  const examDocRef = useMemoFirebase(
    () => (firestore && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, examId]
  );
  const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examDocRef);

  const questionsCollectionRef = useMemoFirebase(
    () => (firestore && examId ? collection(firestore, 'exams', examId, 'questions') : null),
    [firestore, examId]
  );
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsCollectionRef);

  const handleSaveQuestion = async (questionData: QuestionFormData) => {
    if (!firestore || !examId) return;
    try {
      if (viewState.mode === 'edit' && viewState.question) {
        const questionDocRef = doc(firestore, 'exams', examId, 'questions', viewState.question.id);
        updateDocumentNonBlocking(questionDocRef, questionData);
        toast({ title: 'تم تحديث السؤال بنجاح.' });
      } else if (viewState.mode === 'add') {
        const newQuestionData = { ...questionData, examId };
        const questionsColRef = collection(firestore, 'exams', examId, 'questions');
        await addDocumentNonBlocking(questionsColRef, newQuestionData);
        // Increment the questionCount on the exam document
        updateDocumentNonBlocking(examDocRef!, { questionCount: increment(1) });
        toast({ title: 'تم إنشاء السؤال بنجاح.' });
      }
      setViewState({ mode: 'list' });
    } catch (error) {
      toast({ title: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!firestore || !examId || !questionToDelete) return;
    
    try {
      const questionDocRef = doc(firestore, 'exams', examId, 'questions', questionToDelete.id);
      deleteDocumentNonBlocking(questionDocRef);
      // Decrement the questionCount on the exam document
      updateDocumentNonBlocking(examDocRef!, { questionCount: increment(-1) });
      toast({ title: 'تم حذف السؤال بنجاح.', variant: 'default' });
    } catch (error) {
      toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' });
    } finally {
        setQuestionToDelete(null);
    }
  };

  const isLoading = isLoadingExam || isLoadingQuestions;

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!exam) {
    return <div>لم يتم العثور على الاختبار.</div>;
  }
  
  const getCorrectAnswerText = (question: Question) => {
    const correctOptionKey = question.correctAnswer as keyof Question;
    return question[correctOptionKey] as string || 'غير محدد';
  }

  if (viewState.mode === 'add' || viewState.mode === 'edit') {
    return (
       <>
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="outline" size="icon" onClick={() => setViewState({ mode: 'list' })}>
            <Link href={`/admin/dashboard/exams/${examId}/questions`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className='flex-grow'>
             <h1 className="text-lg font-semibold md:text-2xl line-clamp-1">{viewState.mode === 'add' ? 'إضافة سؤال جديد' : 'تعديل السؤال'}</h1>
             <p className="text-sm text-muted-foreground">للاختبار: {exam.title}</p>
          </div>
        </div>
        <QuestionForm
          question={viewState.question}
          onSave={handleSaveQuestion}
          onCancel={() => setViewState({ mode: 'list' })}
        />
      </>
    )
  }
  
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/dashboard/exams"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className='flex-grow'>
          <h1 className="text-lg font-semibold md:text-2xl line-clamp-1">{exam?.title}</h1>
          <p className="text-sm text-muted-foreground">إدارة الأسئلة</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setViewState({ mode: 'add' })}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة سؤال</span>
          </Button>
        </div>
      </div>
      
      {(!questions || questions.length === 0) ? (
         <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">لا توجد أسئلة بعد</h3>
            <p className="text-muted-foreground mt-2">ابدأ بإضافة أول سؤال لهذا الاختبار.</p>
            <Button className="mt-4" onClick={() => setViewState({ mode: 'add' })}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة سؤال
            </Button>
          </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
            {questions?.map((question) => (
            <Card key={question.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="line-clamp-2 text-base text-start" dir="auto">{question.text}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground text-start" dir="auto">
                        <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                        <span>{getCorrectAnswerText(question)}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="ml-2 h-4 w-4 text-amber-400" />
                        <span>{question.points} درجة</span>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setQuestionToDelete(question)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewState({ mode: 'edit', question })}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
      
      <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف السؤال بشكل دائم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
