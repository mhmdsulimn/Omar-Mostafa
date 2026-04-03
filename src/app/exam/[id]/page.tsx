'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ArrowLeft, ArrowRight, Star, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import type { Exam, Question, StudentExam, Student } from '@/lib/data';
import { collection, doc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingAnimation } from '@/components/ui/loading-animation';

function ExamComponent({ examId, courseId, lectureContentId }: { examId: string, courseId: string | null, lectureContentId: string | null }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const [hasTakenExam, setHasTakenExam] = useState<StudentExam | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[] | null>(null);

  const examDocRef = useMemoFirebase(
    () => (firestore && user && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, user, examId]
  );
  const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examDocRef);

  const questionsCollectionRef = useMemoFirebase(
    () => (firestore && user && examId ? collection(firestore, 'exams', examId, 'questions') : null),
    [firestore, user, examId]
  );
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsCollectionRef);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const shuffleArray = (array: Question[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    const checkPreviousSubmission = async () => {
      if (!user || !firestore || !examId || !exam) return;
      
      setIsChecking(true);
      const studentExamsRef = collection(firestore, 'users', user.uid, 'studentExams');
      const q = query(studentExamsRef, where('examId', '==', examId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const submission = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as StudentExam;
        if (!exam.allowRetakes) {
          setHasTakenExam(submission);
          router.replace(`/exam/${examId}/results?studentExamId=${submission.id}`);
        } else {
           setHasTakenExam(submission);
        }
      } else {
        setHasTakenExam(null);
      }
      setIsChecking(false);
    };

    if(!isLoadingExam && exam) {
      checkPreviousSubmission();
    }
  }, [user, firestore, examId, router, exam, isLoadingExam]);

  useEffect(() => {
    if (questions && questions.length > 0 && !shuffledQuestions && !isChecking) {
      setShuffledQuestions(shuffleArray(questions));
    }
  }, [questions, shuffledQuestions, isChecking]);

  const handleSubmit = async () => {
    if (!shuffledQuestions || !user || !firestore || !exam) return;

    setIsSubmitting(true);
    setShowSubmitDialog(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let achievedPoints = 0;
    let totalPoints = 0;

    shuffledQuestions.forEach((q) => {
      totalPoints += q.points || 1;
      const selectedOptionKey = answers[q.id];
      const correctOptionKey = q.correctAnswer;

      if (selectedOptionKey === correctOptionKey) {
        achievedPoints += q.points || 1;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((achievedPoints / totalPoints) * 100) : 0;
    const timeTakenInSeconds = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : (exam.duration * 60) - (timeRemaining || 0);

    let rewardAmountGiven: number | undefined;
    let currentStudentName = "";
    
    try {
      const studentDocRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const studentDoc = await transaction.get(studentDocRef);
        if (!studentDoc.exists()) throw new Error("Student document does not exist!");
        const studentData = studentDoc.data() as Student;
        currentStudentName = `${studentData.firstName} ${studentData.lastName}`;
        
        const hasBeenRewardedBefore = studentData.rewardedExams?.includes(examId);
        if (exam.rewardThreshold && exam.rewardAmount && percentage >= exam.rewardThreshold && !hasBeenRewardedBefore) {
          const currentBalance = studentData.balance || 0;
          const newBalance = currentBalance + exam.rewardAmount!;
          const newRewardedExams = [...(studentData.rewardedExams || []), examId];
          transaction.update(studentDocRef, { balance: newBalance, rewardedExams: newRewardedExams });
          rewardAmountGiven = exam.rewardAmount!;
        }
      });
    } catch (e) {
      console.error("Reward logic failed: ", e);
    }

    const studentExamData = {
      studentId: user.uid,
      examId: examId,
      score: percentage,
      achievedPoints,
      totalPoints,
      submissionDate: new Date().toISOString(),
      answers: answers,
      questions: shuffledQuestions,
      timeTaken: timeTakenInSeconds,
      ...(rewardAmountGiven !== undefined && { rewardAwarded: rewardAmountGiven })
    };

    let studentExamId;
    try {
        if (hasTakenExam && exam.allowRetakes) {
          studentExamId = hasTakenExam.id;
          const studentExamDocRef = doc(firestore, 'users', user.uid, 'studentExams', studentExamId);
          await setDocumentNonBlocking(studentExamDocRef, studentExamData, {});
        } else {
          const studentExamsColRef = collection(firestore, 'users', user.uid, 'studentExams');
          const newDocRef = await addDocumentNonBlocking(studentExamsColRef, studentExamData);
          studentExamId = newDocRef.id;
        }

        if (rewardAmountGiven !== undefined) {
          const notificationsColRef = collection(firestore, `users/${user.uid}/notifications`);
          await addDocumentNonBlocking(notificationsColRef, {
            message: `تهانينا! لقد حصلت على مكافأة قدرها ${rewardAmountGiven} جنيه لتفوقك في اختبار "${exam.title}".`,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'reward',
            link: '/dashboard/wallet',
            studentId: user.uid,
            studentName: currentStudentName
          });
        }

        if (user && firestore && courseId && lectureContentId) {
          const progressDocRef = doc(firestore, `users/${user.uid}/studentCourses/${courseId}/progress`, lectureContentId);
          setDocumentNonBlocking(progressDocRef, { id: lectureContentId, status: 'completed', completedAt: new Date().toISOString() }, {});
        }

        router.push(`/exam/${examId}/results?studentExamId=${studentExamId}`);
    } catch (e) {
        console.error("Submission failed:", e);
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (exam && timeRemaining === null) {
      setTimeRemaining(exam.duration * 60);
      startTimeRef.current = Date.now();
    }
  }, [exam, timeRemaining]);

  useEffect(() => {
    if (isChecking || (hasTakenExam && !exam?.allowRetakes) ) return;
    if (timeRemaining === null || !shuffledQuestions || shuffledQuestions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime === null) return null;
        if (prevTime <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeRemaining === null, shuffledQuestions, isChecking, hasTakenExam, exam]);

  const handleAnswerSelect = (questionId: string, answerKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerKey }));
  };

  const handleNext = () => {
     if (shuffledQuestions && currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const isLoading = isLoadingExam || isLoadingQuestions || isChecking || (questions && questions.length > 0 && !shuffledQuestions);
  const isRedirecting = hasTakenExam && !exam?.allowRetakes;

  if (isLoading || timeRemaining === null || isRedirecting) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
            <LoadingAnimation size="lg" />
        </div>
    )
  }

  if (isSubmitting) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 fixed inset-0 z-[100] animate-in fade-in duration-500">
            <div className="relative flex flex-col items-center gap-8">
                <div className="relative">
                    <LoadingAnimation size="lg" />
                    <div className="absolute -top-4 -right-4 bg-primary text-white p-3 rounded-full shadow-2xl animate-bounce">
                        <Sparkles className="h-6 w-6" />
                    </div>
                </div>
                <div className="text-center space-y-3">
                    <h2 className="text-2xl md:text-4xl font-black tracking-tight text-primary">جارِ تسليم الاختبار...</h2>
                    <p className="text-muted-foreground text-sm md:text-lg font-bold animate-pulse">ثوانٍ وسنقوم بعرض نتيجتك وحساب نقاطك</p>
                </div>
            </div>
        </div>
    )
  }

  if (!exam || !shuffledQuestions || shuffledQuestions.length === 0) {
    return <div className="flex h-screen items-center justify-center">لم يتم العثور على الاختبار أو الأسئلة.</div>;
  }
  
  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-5xl animate-fade-in shadow-2xl border-primary/10 overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex justify-between items-center">
            <div className="text-right">
              <CardTitle className="text-xl md:text-2xl" dir="auto">{exam.title}</CardTitle>
              <CardDescription className="font-bold">
                السؤال {currentQuestionIndex + 1} من {shuffledQuestions.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-background border shadow-sm px-4 py-2 text-lg font-black text-primary">
              <Clock className="ml-2 h-5 w-5" />
              <span dir="ltr">{formatTime(timeRemaining)}</span>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-start leading-relaxed flex-1" dir="auto">
                {currentQuestion.text}
              </h2>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border-amber-200 font-black shrink-0">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span dir="ltr">{currentQuestion.points || 1} درجة</span>
              </Badge>
            </div>

            <div className={cn("grid gap-8 items-start", currentQuestion.imageUrl ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
              {currentQuestion.imageUrl && (
                <div className="relative w-full min-h-[300px] h-full rounded-2xl overflow-hidden shadow-xl border bg-white dark:bg-black/20 group">
                  <Image 
                    src={currentQuestion.imageUrl} 
                    alt="Question Image" 
                    fill 
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.02]" 
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
              )}

              <RadioGroup
                dir="rtl"
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                className="grid grid-cols-1 gap-4"
              >
                {(['option1', 'option2', 'option3', 'option4'] as const).map(opt => (
                  <Label key={opt} htmlFor={opt} dir="auto" className={cn(
                    "flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all hover:border-primary/50 text-start group",
                    answers[currentQuestion.id] === opt ? "bg-primary/5 border-primary shadow-md" : "bg-card border-transparent"
                  )}>
                    <RadioGroupItem value={opt} id={opt} className="h-5 w-5" />
                    <span className="text-base md:text-lg font-bold group-hover:text-primary transition-colors">{currentQuestion[opt]}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted/5 p-6 rounded-b-2xl">
          <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0} className="rounded-xl h-12 px-6 font-bold">
            <ArrowRight className="ml-2 h-4 w-4" /> السابق
          </Button>
          {currentQuestionIndex === shuffledQuestions.length - 1 ? (
            <Button onClick={() => setShowSubmitDialog(true)} className="rounded-xl h-12 px-8 font-black text-lg shadow-lg shadow-primary/20">إرسال الاختبار</Button>
          ) : (
            <Button onClick={handleNext} className="rounded-xl h-12 px-6 font-bold">
              التالي <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-xl font-black">تأكيد تسليم الاختبار</AlertDialogTitle>
            <AlertDialogDescription className="text-right font-bold leading-relaxed">
              أنت على وشك إرسال إجاباتك. لا يمكنك تعديلها بعد هذه الخطوة. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl h-11 px-6">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="rounded-2xl h-11 px-8 font-black">تأكيد الإرسال</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExamPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ courseId?: string, lectureContentId?: string }> }) {
    const resolvedParams = React.use(params);
    const resolvedSearchParams = React.use(searchParams);
    
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
                <LoadingAnimation size="lg" />
            </div>
        }>
            <ExamComponent 
              examId={resolvedParams.id} 
              courseId={resolvedSearchParams.courseId || null} 
              lectureContentId={resolvedSearchParams.lectureContentId || null} 
            />
        </Suspense>
    )
}