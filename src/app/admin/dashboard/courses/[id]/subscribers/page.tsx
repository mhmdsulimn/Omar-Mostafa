'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  Loader2, 
  Trash2, 
  UserMinus, 
  ArrowRight, 
  UserCircle2,
  Mail,
  GraduationCap
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
  errorEmitter,
  FirestorePermissionError
} from '@/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  query, 
  collectionGroup, 
  where, 
  documentId 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { Input } from '@/components/ui/input';
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
import type { Course, Student, StudentCourse } from '@/lib/data';

const gradeLabels: Record<string, string> = {
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
};

export default function CourseSubscribersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = React.use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [studentToRemove, setStudentToRemove] = React.useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  // 1. جلب بيانات الكورس للتأكد من وجوده وعرض العنوان
  const courseRef = useMemoFirebase(() => (firestore && courseId ? doc(firestore, 'courses', courseId) : null), [firestore, courseId]);
  const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseRef);

  // 2. جلب الاشتراكات الخاصة بهذا الكورس فقط (استعلام محسن)
  const subscriptionsQuery = useMemoFirebase(
    () => (firestore && courseId ? query(collectionGroup(firestore, 'studentCourses'), where('courseId', '==', courseId)) : null),
    [firestore, courseId]
  );
  const { data: subscriptions, isLoading: isLoadingSubs } = useCollection<StudentCourse>(subscriptionsQuery, { ignorePermissionErrors: true });

  const studentIds = React.useMemo(() => subscriptions?.map(s => s.studentId) || [], [subscriptions]);

  // 3. جلب بيانات الطلاب (فقط من هم في القائمة)
  const studentsQuery = useMemoFirebase(
    () => (firestore && studentIds.length > 0 ? query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30))) : null),
    [firestore, studentIds]
  );
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery, { ignorePermissionErrors: true });

  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return students;
    
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) || 
      s.email.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const handleRemoveSubscription = async () => {
    if (!firestore || !course || !studentToRemove) return;
    
    setIsRemoving(true);
    try {
      const batch = writeBatch(firestore);
      const studentId = studentToRemove.id;
      
      // 1. مسح سجلات التقدم
      const progressSnap = await getDocs(collection(firestore, `users/${studentId}/studentCourses/${courseId}/progress`));
      progressSnap.docs.forEach(d => batch.delete(d.ref));
      
      // 2. مسح الاشتراك
      batch.delete(doc(firestore, `users/${studentId}/studentCourses/${courseId}`));
      
      // 3. إشعار للطالب
      const notificationRef = doc(collection(firestore, `users/${studentId}/notifications`));
      batch.set(notificationRef, {
        message: `تم إلغاء اشتراكك في كورس "${course.title}" من قبل الإدارة.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        type: 'warning',
        studentId: studentId,
        studentName: `${studentToRemove.firstName} ${studentToRemove.lastName}`
      });

      await batch.commit();
      toast({ title: 'تم إلغاء الاشتراك بنجاح.' });
      setStudentToRemove(null);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `users/${studentToRemove.id}/studentCourses/${courseId}`,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsRemoving(false);
    }
  };

  const isLoading = isLoadingCourse || isLoadingSubs || (studentIds.length > 0 && isLoadingStudents);

  if (isLoading) {
    return <div className="flex h-[60vh] w-full items-center justify-center"><LoadingAnimation size="md" /></div>;
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Users className="h-16 w-16 opacity-20" />
        <h2 className="text-xl font-bold">لم يتم العثور على الكورس</h2>
        <Button onClick={() => router.push('/admin/dashboard/courses')}>العودة للكورسات</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold">إدارة المشتركين</h1>
          <p className="text-muted-foreground text-sm font-medium">{course.title}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 border-none shadow-md bg-primary/5">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              إجمالي المشتركين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-black text-primary">{studentIds.length}</p>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">طالب مسجل حالياً</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold">البحث في القائمة</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث بالاسم أو البريد..." 
                className="pr-9 h-9 rounded-xl text-right"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-center">الصف</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                        {searchTerm ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد مشتركون في هذا الكورس بعد'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map(student => (
                      <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarFallback className="font-bold">{student.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-right">
                              <span className="font-bold text-sm">{student.firstName} {student.lastName}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" />
                                {student.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center p-4">
                          <Badge variant="outline" className="rounded-lg bg-background font-bold text-[10px]">
                            {gradeLabels[student.grade] || '؟'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              onClick={() => router.push(`/admin/dashboard/students?search=${student.email}`)}
                              title="عرض الملف الكامل"
                            >
                              <UserCircle2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={() => setStudentToRemove(student)}
                              title="إلغاء اشتراك الطالب"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!studentToRemove} onOpenChange={(o) => !o && setStudentToRemove(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-2">
              <UserMinus className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-right text-xl font-bold">إلغاء اشتراك الطالب</AlertDialogTitle>
            <AlertDialogDescription className="text-right font-medium leading-relaxed">
              هل أنت متأكد من إلغاء اشتراك <span className="font-black text-foreground underline">{studentToRemove?.firstName} {studentToRemove?.lastName}</span> من هذا الكورس؟ 
              <br />
              سيتم مسح سجل التقدم الخاص به نهائياً من هذا الكورس.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-3">
            <AlertDialogCancel className="rounded-xl font-bold">تراجع</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveSubscription} 
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold gap-2"
            >
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
