'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Star, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Exam, Question, StudentExam } from '@/lib/data';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingAnimation } from '@/components/ui/loading-animation';

function ReviewComponent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const examId = params.id as string;
    const studentExamId = searchParams.get('studentExamId');
    const studentIdFromParams = searchParams.get('userId');

    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const adminRoleDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'roles_admin', user.uid) : null, [user, firestore]);
    const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRoleDocRef);
    const isAdmin = !!adminRole;

    const userIdForReview = isAdmin && studentIdFromParams ? studentIdFromParams : user?.uid;

    const examDocRef = useMemoFirebase(
        () => (firestore && user && examId) ? doc(firestore, 'exams', examId) : null,
        [firestore, user, examId]
    );
    const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examDocRef);
    
    const studentExamDocRef = useMemoFirebase(
      () => (firestore && userIdForReview && studentExamId) ? doc(firestore, 'users', userIdForReview, 'studentExams', studentExamId) : null,
      [firestore, userIdForReview, studentExamId]
    );
    const { data: submission, isLoading: isLoadingSubmission } = useDoc<StudentExam>(studentExamDocRef);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    const questions = submission?.questions;

    const handleNext = () => {
        if (questions && currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };
    
    const isLoading = isLoadingExam || isLoadingSubmission || isUserLoading || isAdminLoading;
    
    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
                <LoadingAnimation size="lg" />
            </div>
        )
    }

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
    
    if (!exam || !questions || !submission || !submission.answers) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
                 <LoadingAnimation size="lg" />
            </div>
        )
    }

    if (questions.length === 0) {
        return <div className="flex h-screen items-center justify-center">لا توجد أسئلة لهذا الاختبار.</div>;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const studentAnswerKey = submission.answers[currentQuestion.id];
    const correctAnswerKey = currentQuestion.correctAnswer;
    const isCorrect = studentAnswerKey === correctAnswerKey;

    const getOptionStyle = (optionKey: string) => {
        if (optionKey === correctAnswerKey) {
            return "bg-green-100 dark:bg-green-900/50 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]";
        }
        if (optionKey === studentAnswerKey && !isCorrect) {
            return "bg-red-100 dark:bg-red-900/50 border-destructive shadow-[0_0_15px_rgba(239,68,68,0.1)]";
        }
        return "hover:bg-accent border-transparent bg-card";
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
            <Card className="w-full max-w-5xl animate-fade-in shadow-2xl border-primary/10 overflow-hidden">
                <CardHeader className="border-b bg-muted/10">
                     <div className="flex justify-between items-center">
                        <div className="text-right">
                            <CardTitle className="text-xl md:text-2xl text-start" dir="auto">{exam.title}</CardTitle>
                            <CardDescription className="font-bold">مراجعة الإجابات - سؤال {currentQuestionIndex + 1} من {questions.length}</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => router.back()} className="rounded-xl font-bold h-10 px-6">العودة</Button>
                    </div>
                </CardHeader>
                <CardContent className="py-8">
                    <div className="flex flex-col gap-8">
                        <div className="flex justify-between items-start gap-4">
                            <h2 className="text-xl md:text-2xl font-bold text-start leading-relaxed flex-1" dir="auto">
                                {currentQuestion.text}
                            </h2>
                            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 font-black shrink-0">
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                <span>{currentQuestion.points || 1} درجة</span>
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
                            
                            <RadioGroup dir="rtl" value={studentAnswerKey} className="grid grid-cols-1 gap-4 pt-0" disabled>
                            {(['option1', 'option2', 'option3', 'option4'] as const).map(opt => (
                                <Label key={opt} htmlFor={opt} dir="auto" className={cn(
                                    "flex items-center gap-4 rounded-2xl border-2 p-5 transition-all text-start group cursor-default",
                                    getOptionStyle(opt)
                                )}>
                                    <RadioGroupItem value={opt} id={opt} className="h-5 w-5" />
                                    <span className="text-base md:text-lg font-bold flex-1">{currentQuestion[opt]}</span>
                                    {opt === correctAnswerKey && <CheckCircle className="mr-auto h-6 w-6 text-green-600 animate-in zoom-in-50 duration-300" />}
                                    {opt === studentAnswerKey && !isCorrect && <XCircle className="mr-auto h-6 w-6 text-destructive animate-in zoom-in-50 duration-300" />}
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
                    <Button onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1} className="rounded-xl h-12 px-6 font-bold">
                        التالي <ArrowLeft className="mr-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


export default function ReviewPage() {
    return (
        <Suspense fallback={<div className='flex h-screen w-full items-center justify-center'><LoadingAnimation size="lg" /></div>}>
            <ReviewComponent />
        </Suspense>
    )
}
