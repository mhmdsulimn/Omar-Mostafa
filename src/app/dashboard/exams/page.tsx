'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, HelpCircle, BookOpen, Award, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Exam, Student, StudentExam } from '@/lib/data';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function StudentExamsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(userDocRef);

  const studentExamsQuery = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, 'users', user.uid, 'studentExams') : null,
    [firestore, user]
  );
  const { data: completedExams, isLoading: isLoadingCompletedExams } = useCollection<StudentExam>(studentExamsQuery);

  const examsQuery = useMemoFirebase(
    () => {
      if (firestore && studentData && studentData.grade) {
        return query(
          collection(firestore, 'exams'),
          where('grade', '==', studentData.grade),
          where('isPrivate', '==', false)
        );
      }
      return null;
    },
    [firestore, studentData]
  );
  
  const { data: exams, isLoading: isLoadingExamsCollection } = useCollection<Exam>(examsQuery);
  
  const completedExamMap = React.useMemo(() => {
    if (!completedExams) return new Map();
    return new Map(completedExams.map(ex => [ex.examId, ex]));
  }, [completedExams]);
  
  const filteredExams = React.useMemo(() => {
    if (!exams) return [];
    
    // فلترة الاختبارات للتأكد من وجود سؤال واحد على الأقل
    const validExams = exams.filter(exam => (exam.questionCount || 0) > 0);

    if (!searchTerm) return validExams;

    return validExams.filter(exam => 
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [exams, searchTerm]);

  const isLoading = isLoadingStudent || isLoadingExamsCollection || isLoadingCompletedExams;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
        <LoadingAnimation size="md" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl text-primary">الاختبارات المتاحة</h1>
      </div>

       <Card className='mb-6 border-none shadow-sm md:shadow-md bg-muted/20 md:bg-card'>
        <CardHeader>
          <CardTitle className="text-base md:text-lg text-right">بحث عن اختبار</CardTitle>
          <CardDescription className="text-right">ابحث عن اختبار محدد بالاسم أو الوصف.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو الوصف..."
                className="pr-8 bg-background text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </CardContent>
      </Card>

       {filteredExams.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/10">
                <h3 className="text-lg font-semibold">{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد اختبارات متاحة'}</h3>
                <p className="text-muted-foreground mt-2">{searchTerm ? 'جرّب البحث بكلمات أخرى.' : 'لا توجد اختبارات متاحة لصفك الدراسي حالياً.'}</p>
            </div>
        ) : (
          <div className="flex flex-wrap gap-8 animate-fade-in">
          {filteredExams.map((exam, index) => {
            const completedExam = completedExamMap.get(exam.id);
            const isCompleted = !!completedExam;
            const canRetake = exam.allowRetakes;

            return(
              <div key={exam.id} className="flex-1 min-w-[300px] animate-slide-in-up" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
                <Card className="flex flex-col h-full hover:shadow-lg transition-shadow border-primary/10">
                  <CardHeader className="text-right">
                    <CardTitle className="line-clamp-1">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">{exam.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2 text-right">
                    <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                      <span>{exam.questionCount || 0} أسئلة</span>
                    </div>
                    <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{exam.duration} دقيقة</span>
                    </div>
                    {exam.rewardAmount > 0 && (
                      <div className="flex items-center justify-start gap-2 text-sm text-amber-600 font-bold">
                        <Award className="h-4 w-4" />
                        <span>مكافأة {exam.rewardAmount} جنيه</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 sm:flex-row border-t pt-4">
                    {!isCompleted ? (
                      <Button asChild className="flex-1 font-bold h-11">
                        <Link href={`/exam/${exam.id}`}>ابدأ الاختبار</Link>
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" className="flex-1 h-11" onClick={() => router.push(`/exam/${exam.id}/review?studentExamId=${completedExam.id}`)}>
                          <BookOpen className="ml-2 h-4 w-4" />
                          مراجعة
                        </Button>
                        {canRetake && (
                          <Button asChild className="flex-1 font-bold h-11">
                            <Link href={`/exam/${exam.id}`}>أعد الاختبار</Link>
                          </Button>
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              </div>
            )
          })}
          </div>
        )}
    </>
  );
}
