'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Award, BookOpen, Loader2 } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { StudentExam, Exam } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingAnimation } from '@/components/ui/loading-animation';

function Results() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();

  const examId = params.id as string;
  const studentExamId = searchParams.get('studentExamId');

  const studentExamDocRef = useMemoFirebase(
      () => user && studentExamId && firestore ? doc(firestore, 'users', user.uid, 'studentExams', studentExamId) : null,
      [user, studentExamId, firestore]
  );
  const { data: submission, isLoading: isLoadingSubmission } = useDoc<StudentExam>(studentExamDocRef);
  
  const examDocRef = useMemoFirebase(
      () => (firestore && user && examId) ? doc(firestore, 'exams', examId) : null,
      [firestore, user, examId]
  );
  const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examDocRef);

  const isLoading = isLoadingSubmission || isLoadingExam;

  if (!studentExamId) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">خطأ</CardTitle>
                    <CardDescription>لم يتم العثور على معرّف تقديم الاختبار.</CardDescription>
                </CardHeader>
                 <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/dashboard/courses')}>
                        العودة إلى الرئيسية
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (isLoading || !submission || !exam) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
            <LoadingAnimation size="lg" />
        </div>
      );
  }

  const { score, achievedPoints, totalPoints } = submission;
  const isPass = score >= 70;
  const wasRewarded = submission.rewardAwarded && submission.rewardAwarded > 0;


  const getFeedback = () => {
    if (score >= 90) return { title: 'ممتاز!', message: "لقد أتقنت هذا الموضوع." };
    if (score >= 70) return { title: 'عمل رائع!', message: 'لديك فهم قوي للمادة.' };
    if (score >= 50) return { title: 'مجهود طيب', message: 'هناك مجال للتحسين. استمر في المذاكرة!' };
    return { title: 'بحاجة إلى تحسين', message: "لا تستسلم. راجع المادة وحاول مرة أخرى." };
  };

  const feedback = getFeedback();

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-lg text-center animate-fade-in">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted animate-slide-in-up">
            {isPass ? (
              <Award className="h-10 w-10 text-primary" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
          </div>
          <CardTitle className="mt-4 text-3xl font-bold">{feedback.title}</CardTitle>
          <CardDescription>{feedback.message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">نتيجتك</p>
          <div
            className={`flex h-40 w-40 flex-col items-center justify-center rounded-full border-8 p-4 ${
              isPass ? 'border-primary' : 'border-destructive'
            }`}
          >
            <span className="text-5xl font-bold">{score}%</span>
            {totalPoints > 0 && <span className="text-lg text-muted-foreground font-semibold">{achievedPoints}/{totalPoints}</span>}
          </div>
          {isPass ? (
            <p className="flex items-center justify-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /> لقد نجحت في الاختبار!</p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> لم تنجح في الاختبار.</p>
          )}
          {wasRewarded && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-100 p-3 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              <Award className="h-5 w-5" />
              <p className="font-semibold">مكافأة! تمت إضافة {submission.rewardAwarded} جنيه إلى محفظتك.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
           <Button className="w-full" variant="outline" onClick={() => router.push(`/exam/${examId}/review?studentExamId=${studentExamId}`)}>
             <BookOpen className="ml-2 h-4 w-4" />
             مراجعة الإجابات
           </Button>
          <Button className="w-full" onClick={() => router.push('/dashboard/courses')}>
            العودة إلى تصفح الكورسات
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className='flex h-screen w-full items-center justify-center'><LoadingAnimation size="lg" /></div>}>
            <Results />
        </Suspense>
    )
}
