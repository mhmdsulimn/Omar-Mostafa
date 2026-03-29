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
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, collectionGroup, where, documentId } from 'firebase/firestore';
import type { Student, Exam, StudentExam } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Button } from '@/components/ui/button';
import { BookOpen, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/ui/loading-animation';

const gradeMap: Record<Student['grade'], string> = {
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
};

const formatTime = (seconds: number | undefined) => {
    if (typeof seconds !== 'number' || seconds < 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function AdminScoresPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const sParams = React.use(searchParams);

  // Filters state
  const [studentNameFilter, setStudentNameFilter] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('all');
  const [examFilter, setExamFilter] = React.useState('all');

  React.useEffect(() => {
    if (sParams.email) {
        setStudentNameFilter(sParams.email);
    }
  }, [sParams.email]);

  // Data fetching
  const allSubmissionsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'studentExams')) : null), [firestore, user]);
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<StudentExam>(allSubmissionsQuery, { ignorePermissionErrors: true });
  
  const studentIds = React.useMemo(() => {
    if (!allSubmissions) return [];
    return [...new Set(allSubmissions.map(sub => sub.studentId))];
  }, [allSubmissions]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || studentIds.length === 0) return null;
    return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
  }, [firestore, user, studentIds]);
  const { data: usersForSubmissions, isLoading: isLoadingUsers } = useCollection<Student>(usersQuery, { ignorePermissionErrors: true });
  
  const allExamsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'exams') : null), [firestore, user]);
  const { data: allExams, isLoading: isLoadingExams } = useCollection<Exam>(allExamsQuery, { ignorePermissionErrors: true });

  const isLoading = isLoadingSubmissions || (studentIds.length > 0 && isLoadingUsers) || isLoadingExams;

  const processedData = React.useMemo(() => {
    if (!allSubmissions || !usersForSubmissions || !allExams) {
      return [];
    }

    const studentsMap = new Map(usersForSubmissions.map(user => [user.id, user]));
    const examsMap = new Map(allExams.map(exam => [exam.id, exam]));

    return allSubmissions
      .map(submission => {
        const student = studentsMap.get(submission.studentId);
        const exam = examsMap.get(submission.examId);
        if (!student || !exam) return null;
        
        return {
          ...submission,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
          studentGrade: student.grade,
          examTitle: exam.title,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [allSubmissions, usersForSubmissions, allExams]);

  const filteredData = React.useMemo(() => {
    return processedData.filter(item => {
      const studentName = item.studentName.toLowerCase();
      const search = studentNameFilter.toLowerCase();
      
      const nameMatch = !search || studentName.includes(search) || (item.studentEmail && item.studentEmail.toLowerCase().includes(search));
      const gradeMatch = gradeFilter === 'all' || item.studentGrade === gradeFilter;
      const examMatch = examFilter === 'all' || item.examId === examFilter;

      return nameMatch && gradeMatch && examMatch;
    });
  }, [processedData, studentNameFilter, gradeFilter, examFilter]);

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">سجل الدرجات</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>متابعة درجات الطلاب</CardTitle>
          <CardDescription>
            عرض جميع الدرجات المسجلة مع إمكانيات الفلترة والبحث.
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                  placeholder="ابحث بالطالب..."
                  className="pr-8"
                  value={studentNameFilter}
                  onChange={(e) => setStudentNameFilter(e.target.value)}
              />
            </div>
            <Select dir="rtl" value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="فلترة بالصف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الصفوف</SelectItem>
                <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
              </SelectContent>
            </Select>
            <Select dir="rtl" value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="فلترة بالاختبار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الاختبارات</SelectItem>
                {allExams?.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الاختبار</TableHead>
                  <TableHead>الصف</TableHead>
                  <TableHead className="text-center">الدرجة</TableHead>
                  <TableHead className="text-center">الوقت المستغرق</TableHead>
                  <TableHead>تاريخ التقديم</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.studentName}</div>
                      <div className="text-sm text-muted-foreground">{item.studentEmail}</div>
                    </TableCell>
                    <TableCell>{item.examTitle}</TableCell>
                    <TableCell>{gradeMap[item.studentGrade]}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.score >= 70 ? 'default' : 'destructive'}>
                        {`${item.score}%`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono" dir="ltr">
                        {formatTime(item.timeTaken)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                          <span>{format(new Date(item.submissionDate), 'd MMMM yyyy', { locale: arSA })}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(item.submissionDate), 'h:mm a', { locale: arSA })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-2">
                       <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/exam/${item.examId}/review?studentExamId=${item.id}&userId=${item.studentId}`)}
                        >
                         <BookOpen className="ml-2 h-4 w-4" />
                         مراجعة
                       </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      لا توجد نتائج تطابق الفلتر الحالي.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
