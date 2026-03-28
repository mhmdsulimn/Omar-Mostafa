'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Exam, StudentExam } from '@/lib/data';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function MyScoresPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const studentExamsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? collection(firestore, 'users', user.uid, 'studentExams')
        : null,
    [firestore, user]
  );
  const { data: scores, isLoading: isLoadingScores } = useCollection<StudentExam>(studentExamsQuery);
  
  const examsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'exams') : null),
    [firestore, user]
  );
  const { data: exams, isLoading: isLoadingExams } = useCollection<Exam>(examsCollection);


  const studentScores = React.useMemo(() => {
    if (!scores || !exams) return [];
    const examsMap = new Map(exams.map(exam => [exam.id, exam]));
    return scores
    .map((score) => ({
      ...score,
      exam: examsMap.get(score.examId),
    }))
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [scores, exams])

  const isLoading = isUserLoading || isLoadingScores || isLoadingExams;

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">درجاتي</h1>
      </div>
      <Card className="animate-slide-in-up">
        <CardHeader>
          <CardTitle>سجل الاختبارات</CardTitle>
          <CardDescription>
            فيما يلي نتائج الاختبارات التي أكملتها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان الاختبار</TableHead>
                <TableHead className="text-center">الدرجة</TableHead>
                <TableHead>تاريخ الإجراء</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentScores.map((score, index) => (
                <TableRow key={score.id}
                  className="animate-slide-in-up"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                >
                  <TableCell className="font-medium">{score.exam?.title}</TableCell>
                  <TableCell className="text-center">
                     <Badge
                        variant={
                          score.score > 70 ? 'default' : 'destructive'
                        }
                      >
                      {`${score.achievedPoints}/${score.totalPoints} (${score.score}%)`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span>{format(new Date(score.submissionDate), 'd MMMM yyyy', { locale: arSA })}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(score.submissionDate), 'h:mm a', { locale: arSA })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                     <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/exam/${score.examId}/review?studentExamId=${score.id}`)}
                      >
                       <BookOpen className="ml-2 h-4 w-4" />
                       مراجعة
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
