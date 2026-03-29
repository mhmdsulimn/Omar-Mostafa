'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import type { Exam } from '@/lib/data';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Pencil, Trash2, Clock, HelpCircle, BookText, Loader2, GraduationCap, RefreshCw, EyeOff, Search, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, getDocs, writeBatch, query, collectionGroup, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn } from '@/lib/utils';

const gradeMap: Record<Exam['grade'], string> = {
  first_secondary: 'الأول الثانوي',
  second_secondary: 'الثاني الثانوي',
  third_secondary: 'الثالث الثانوي',
};

type DialogState = 
  | { type: 'delete'; exam: Exam }
  | null;

export default function AdminExamsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('all');
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const examsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'exams') : null),
    [firestore, user]
  );
  const { data: exams, isLoading: isLoadingExams } = useCollection<Exam>(examsCollection);
  
  const handleDeleteExam = async () => {
    if (dialogState?.type !== 'delete' || !firestore) return;
    
    const exam = dialogState.exam;
    setIsProcessing(true);
    
    try {
      // 1. جلب جميع الأسئلة التابعة للاختبار
      const questionsSnap = await getDocs(collection(firestore, `exams/${exam.id}/questions`));
      
      // 2. جلب جميع نتائج الطلاب المرتبطة بهذا الاختبار من كافة الحسابات
      // نستخدم استعلام المجموعة (collectionGroup) للوصول للنتائج في جميع مسارات المستخدمين
      const submissionsSnap = await getDocs(query(
        collectionGroup(firestore, 'studentExams'),
        where('examId', '==', exam.id)
      ));

      const batch = writeBatch(firestore);
      
      // إضافة الأسئلة للحذف
      questionsSnap.docs.forEach(q => batch.delete(q.ref));
      
      // إضافة نتائج الطلاب للحذف (هذا سيقوم بتحديث لوحة الصدارة تلقائياً)
      submissionsSnap.docs.forEach(s => batch.delete(s.ref));
      
      // حذف وثيقة الاختبار الرئيسية
      batch.delete(doc(firestore, 'exams', exam.id));
      
      batch.commit()
        .then(() => {
          toast({ 
            title: 'تم الحذف بنجاح', 
            description: `تم حذف الاختبار (${exam.title}) وعدد ${submissionsSnap.size} من نتائج الطلاب المرتبطة به.` 
          });
        })
        .catch(async (e) => {
          const permissionError = new FirestorePermissionError({
            path: `exams/${exam.id} or collectionGroup(studentExams)`,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
          setIsProcessing(false);
          setDialogState(null);
        });

    } catch (e: any) {
      console.error("Error setting up exam deletion batch:", e);
      if (e.name === 'FirebaseError') {
          const permissionError = new FirestorePermissionError({
            path: `exams/${exam.id}/questions`,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
      }
      setIsProcessing(false);
      setDialogState(null);
    }
  };

  const sortedExams = React.useMemo(() => {
    return exams?.sort((a, b) => {
      if (a.grade && b.grade) {
        return a.grade.localeCompare(b.grade);
      }
      if (a.grade) return -1;
      if (b.grade) return 1;
      return 0;
    }) ?? [];
  }, [exams]);

  const filteredExams = React.useMemo(() => {
    return sortedExams.filter(exam => {
      const searchMatch = !searchTerm ||
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const gradeMatch = gradeFilter === 'all' || exam.grade === gradeFilter;

      return searchMatch && gradeMatch;
    });
  }, [sortedExams, searchTerm, gradeFilter]);

  if (isLoadingExams) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">الاختبارات</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => router.push(`/admin/dashboard/exams/new`)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة امتحان</span>
          </Button>
        </div>
      </div>

      <Card className='mb-6'>
        <CardHeader className="px-4 md:px-6">
          <CardTitle>بحث وفلترة</CardTitle>
          <CardDescription>ابحث عن امتحان محدد أو قم بالفلترة حسب الصف الدراسي.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو الوصف..."
                className="pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select dir="rtl" value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="فلترة بالصف الدراسي" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">كل الصفوف</SelectItem>
                    <SelectItem value="first_secondary">الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary">الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary">الثالث الثانوي</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {filteredExams.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">{searchTerm || gradeFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد اختبارات بعد'}</h3>
            <p className="text-muted-foreground mt-2">{searchTerm || gradeFilter !== 'all' ? 'جرّب البحث أو الفلترة بكلمات أخرى.' : 'ابدأ بإضافة أول اختبار.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="line-clamp-1 text-base md:text-lg">{exam.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs h-8 mt-1">{exam.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 p-4 pt-0 text-right">
                 <div className="flex items-center justify-start gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>{gradeMap[exam.grade]}</span>
                </div>
                 <div className="flex items-center justify-start gap-2 text-xs text-muted-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>{exam.questionCount || 0} أسئلة</span>
                </div>
                <div className="flex items-center justify-start gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{exam.duration} دقيقة</span>
                </div>
                {exam.isPrivate && (
                    <div className="flex items-center justify-start gap-2 text-xs text-amber-600">
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>خاص (مخفي عن الطلاب)</span>
                    </div>
                )}
                {exam.rewardAmount > 0 && (
                  <div className="flex items-center justify-start gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    <Award className="h-3.5 w-3.5" />
                    <span>مكافأة {exam.rewardAmount} جنيه لمن يحصل على {exam.rewardThreshold}%</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 bg-muted/30 p-3 border-t">
                <div className="flex items-center gap-1 md:gap-2">
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setDialogState({ type: 'delete', exam })}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/dashboard/exams/${exam.id}`)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/dashboard/exams/${exam.id}/questions`)}
                  className="gap-1 px-3 h-8 text-xs"
                >
                  <BookText className="h-3.5 w-3.5" />
                  <span>الأسئلة</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <AlertDialog open={dialogState?.type === 'delete'} onOpenChange={(open) => !open && setDialogState(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيؤدي هذا إلى حذف الاختبار وجميع أسئلته ونتائج الطلاب المرتبطة به بشكل دائم من المنصة ولوحة الصدارة. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
