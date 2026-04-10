'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Course, Student, StudentCourse } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Clock, ImageIcon, Search, Eye, EyeOff, Trash2, Users, ArrowRight, UserCircle2, Share2, AlertTriangle, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, getDocs, writeBatch, query, collectionGroup, where, documentId, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { cn, toArabicDigits } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { ScrollArea } from '@/components/ui/scroll-area';

const gradeMap: Record<string, string> = {
  first_secondary: 'الصف الأول الثانوي',
  second_secondary: 'الصف الثاني الثانوي',
  third_secondary: 'الصف الثالث الثانوي',
};

function CourseSubscribersDialog({ course, isOpen, onOpenChange }: { course: Course | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [studentToRemove, setStudentToRemove] = React.useState<Student | null>(null);
    const [isRemoving, setIsRemoving] = React.useState(false);

    // جلب كافة الاشتراكات في النظام
    const subscriptionsQuery = useMemoFirebase(
        () => (firestore && course ? collectionGroup(firestore, 'studentCourses') : null),
        [firestore, course?.id]
    );
    const { data: allSubscriptions, isLoading: isLoadingSubs } = useCollection<StudentCourse>(subscriptionsQuery, { ignorePermissionErrors: true });

    // استخراج معرفات الطلاب المشتركين في هذا الكورس تحديداً
    const studentIds = React.useMemo(() => {
        if (!allSubscriptions || !course) return [];
        return allSubscriptions
            .filter(sub => sub.courseId === course.id)
            .map(s => s.studentId);
    }, [allSubscriptions, course?.id]);

    // جلب بيانات الطلاب من مجموعة users
    const studentsQuery = useMemoFirebase(
        () => (firestore && studentIds.length > 0 ? query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30))) : null),
        [firestore, studentIds]
    );
    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery, { ignorePermissionErrors: true });

    const filteredStudents = React.useMemo(() => {
        if (!students) return [];
        const term = searchTerm.toLowerCase().trim();
        if (!term) return students;
        
        const searchParts = term.split(/\s+/).filter(p => p.length > 0);

        return students.filter(s => {
            const firstName = (s.firstName || '').toLowerCase();
            const lastName = (s.lastName || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`.trim();
            const email = (s.email || '').toLowerCase();
            
            return searchParts.every(part => 
                fullName.includes(part) || email.includes(part)
            );
        });
    }, [students, searchTerm]);

    const handleRemoveSubscription = async () => {
        if (!firestore || !course || !studentToRemove) return;
        
        setIsRemoving(true);
        try {
            const batch = writeBatch(firestore);
            const studentId = studentToRemove.id;
            
            // 1. حذف سجلات التقدم لضمان نظافة البيانات
            const progressSnap = await getDocs(collection(firestore, `users/${studentId}/studentCourses/${course.id}/progress`));
            progressSnap.docs.forEach(d => batch.delete(d.ref));
            
            // 2. حذف وثيقة الاشتراك الأساسية
            batch.delete(doc(firestore, `users/${studentId}/studentCourses/${course.id}`));
            
            // 3. إضافة إشعار للطالب
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
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل إلغاء الاشتراك' });
        } finally {
            setIsRemoving(false);
        }
    };

    const isLoading = isLoadingSubs || (studentIds.length > 0 && isLoadingStudents);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl rounded-[2rem] overflow-hidden p-0 border-none shadow-2xl bg-card">
                    <DialogHeader className="p-6 bg-primary/5 border-b text-right">
                        <div className="flex items-center justify-between flex-row-reverse mb-2">
                            <div className="bg-primary/10 p-2 rounded-xl"><Users className="h-5 w-5 text-primary" /></div>
                            <DialogTitle className="text-xl font-bold">إدارة المشتركين</DialogTitle>
                        </div>
                        <DialogDescription className="text-right font-medium">كورس: {course?.title}</DialogDescription>
                        <div className="relative mt-4">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث عن طالب بالاسم الكامل..." 
                                className="pr-9 bg-background h-11 rounded-xl text-right"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </DialogHeader>
                    <div className="p-0">
                        <ScrollArea className="h-[400px]">
                            {isLoading ? (
                                <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" /></div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                                    <Users className="h-10 w-10 opacity-10" />
                                    <p className="text-sm font-bold">{searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد مشتركون في هذا الكورس بعد'}</p>
                                </div>
                            ) : (
                                <div className="divide-y" dir="rtl">
                                    {filteredStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3 text-right">
                                                <Avatar className="h-9 w-9 border shadow-sm">
                                                    <AvatarFallback className="font-bold text-xs">{student.firstName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col text-right">
                                                    <span className="font-bold text-sm">{student.firstName} {student.lastName}</span>
                                                    <span className="text-[10px] text-muted-foreground">{gradeMap[student.grade] || 'غير محدد'} • {student.email}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 border-destructive/20 rounded-xl transition-all"
                                                    onClick={() => setStudentToRemove(student)}
                                                    title="إلغاء الاشتراك"
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-primary hover:bg-primary/10 border-primary/20 rounded-xl transition-all"
                                                    onClick={() => {
                                                        onOpenChange(false);
                                                        router.push(`/admin/dashboard/students?search=${student.email}`);
                                                    }}
                                                    title="عرض الملف"
                                                >
                                                    <UserCircle2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="p-4 bg-muted/20 border-t text-center">
                        <p className="text-[10px] text-muted-foreground font-bold italic">إجمالي المشتركين الفعليين: {studentIds.length} طالب</p>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!studentToRemove} onOpenChange={(o) => !o && setStudentToRemove(null)}>
                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-2">
                            <UserMinus className="h-8 w-8 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-right text-xl font-bold">إلغاء اشتراك الطالب</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-medium leading-relaxed">
                            هل أنت متأكد من إلغاء اشتراك الطالب <span className="font-black text-foreground underline">{studentToRemove?.firstName} {studentToRemove?.lastName}</span> في كورس <span className="font-black text-foreground">"{course?.title}"</span>؟ 
                            <br />
                            سيتم مسح سجل التقدم الخاص به ولن يتمكن من مشاهدة المحتوى إلا بعد الاشتراك مجدداً.
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
        </>
    );
}

export default function AdminCoursesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('all');
  const [dialogState, setDialogState] = React.useState<{ type: 'delete' | 'subscribers'; course: Course } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const coursesCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'courses') : null),
    [firestore, user]
  );
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesCollection);
  
  const handleTogglePublish = async (course: Course) => {
    if (!firestore) return;
    const courseDocRef = doc(firestore, 'courses', course.id);
    const newStatus = !course.isPublished;
    try {
        updateDocumentNonBlocking(courseDocRef, { isPublished: newStatus });
        toast({ title: newStatus ? 'تم نشر الكورس بنجاح.' : 'تم إخفاء الكورس بنجاح.' });
    } catch (error) {
        toast({ title: 'حدث خطأ', variant: 'destructive' });
    }
  }

  const handleShare = (courseId: string) => {
    const shareUrl = `${window.location.origin}/dashboard/courses/${courseId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: 'تم النسخ!',
          description: 'يمكنك الآن إرسال رابط الكورس المباشر للطلاب.',
        });
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ title: 'تم النسخ!' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'فشل النسخ' });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDeleteCourse = async () => {
    if (dialogState?.type !== 'delete' || !firestore) return;
    
    const course = dialogState.course;
    setIsProcessing(true);
    
    try {
      const lecturesSnap = await getDocs(collection(firestore, `courses/${course.id}/lectures`));
      const batch = writeBatch(firestore);
      
      for (const lectureDoc of lecturesSnap.docs) {
        const contentsSnap = await getDocs(collection(firestore, `courses/${course.id}/lectures/${lectureDoc.id}/contents`));
        contentsSnap.docs.forEach(c => batch.delete(c.ref));
        batch.delete(lectureDoc.ref);
      }
      
      batch.delete(doc(firestore, 'courses', course.id));
      
      batch.commit()
        .then(() => {
          toast({ 
            title: 'تم الحذف بنجاح', 
            description: 'تم حذف الكورس وجميع محتوياته المرتبطة به.' 
          });
        })
        .catch(async (e) => {
          const permissionError = new FirestorePermissionError({
            path: `courses/${course.id}`,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
          setIsProcessing(false);
          setDialogState(null);
        });

    } catch (e: any) {
      console.error("Error setting up deletion batch:", e);
      if (e.name === 'FirebaseError') {
          const permissionError = new FirestorePermissionError({
            path: `courses/${course.id}/lectures`,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
      }
      setIsProcessing(false);
      setDialogState(null);
    }
  };

  const sortedCourses = React.useMemo(() => {
    return courses?.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) ?? [];
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    return sortedCourses.filter(course => {
      const searchMatch = !searchTerm ||
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const gradeMatch = gradeFilter === 'all' || course.grade === gradeFilter;

      return searchMatch && gradeMatch;
    });
  }, [sortedCourses, searchTerm, gradeFilter]);

  if (isLoadingCourses) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-semibold md:text-2xl text-right">الكورسات</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/admin/dashboard/courses/new">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">إضافة كورس</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className='mb-6'>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-right">بحث وفلترة</CardTitle>
          <CardDescription className="text-right">ابحث عن كورس محدد أو قم بالفلترة حسب السعر.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو بالوصف..."
                className="pr-8 text-right"
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
                <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {filteredCourses.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">{searchTerm || gradeFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد كورسات بعد'}</h3>
          <p className="text-muted-foreground mt-2">{searchTerm || gradeFilter !== 'all' ? 'جرّب البحث أو الفلترة بكلمات أخرى.' : 'ابدأ بإضافة أول كورس.'}</p>
          {(!searchTerm && gradeFilter === 'all') && (
            <Button className="mt-4" asChild>
              <Link href="/admin/dashboard/courses/new">
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة كورس
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-8 justify-center lg:justify-start">
          {filteredCourses.map((course) => {
            const hasDiscount = !!course.discountPrice && course.discountPrice > 0;
            const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));

            return (
              <div key={course.id} className={cn("relative transition-all duration-300 w-full sm:w-[420px] shrink-0 group", !course.isPublished && "opacity-60 hover:opacity-100")}>
                  <div className={cn("relative aspect-video w-full rounded-2xl bg-muted flex items-center justify-center overflow-hidden shadow-lg transition-all", !course.isPublished && "ring-2 ring-dashed ring-muted-foreground")}>
                      {course.thumbnailUrl ? (
                          <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
                      ) : (
                          <ImageIcon className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                      )}
                      {!course.isPublished && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                              <p className="text-white font-bold text-lg">غير منشور</p>
                          </div>
                      )}
                  </div>

                  <div className="bg-card p-6 pt-7 -mt-8 mx-auto w-[92%] relative z-20 rounded-2xl shadow-xl space-y-4 border">
                      <div className="flex flex-col gap-2">
                          <div className="w-full text-right" dir="rtl">
                              <h3 className="text-xl font-bold text-right truncate">{course.title}</h3>
                              <div className="my-1 border-t border-primary/20 w-1/2 ml-auto"></div>
                              <p className="text-sm text-muted-foreground text-right line-clamp-2" dir="rtl">
                                  {course.description}
                              </p>
                          </div>
                          
                          <div className="w-full mt-4 space-y-3">
                              <Button variant="outline" className='h-11 text-sm w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold' onClick={() => router.push(`/admin/dashboard/courses/${course.id}`)}>إدارة الكورس</Button>
                              
                              <div className="flex items-center justify-between gap-2">
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className='flex-1 h-10 border-muted hover:bg-muted transition-colors' onClick={() => handleTogglePublish(course)}>
                                              {course.isPublished ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-green-600" />}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{course.isPublished ? "إخفاء عن الطلاب" : "إظهار للطلاب"}</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className='flex-1 h-10 border-muted hover:bg-muted text-blue-600' onClick={() => handleShare(course.id)}>
                                              <Share2 className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>نسخ رابط الكورس للطلاب</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className='flex-1 h-10 border-muted hover:bg-muted text-primary' onClick={() => setDialogState({ type: 'subscribers', course })}>
                                              <Users className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>الطلاب المشتركين</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className='flex-1 h-10 border-muted hover:bg-destructive/10 hover:border-destructive/20 text-destructive' onClick={() => setDialogState({ type: 'delete', course })}>
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>حذف الكورس</p></TooltipContent>
                                  </Tooltip>
                              </div>
                          </div>
                      </div>

                      <div className="border-t my-2"></div>

                      <div className="flex w-full justify-between items-center text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                              {effectivePrice > 0 ? (
                                <div className="inline-flex items-center justify-between bg-primary rounded-xl text-primary-foreground font-bold p-1 h-9 shadow-md shadow-primary/20">
                                  <div className="bg-primary-foreground text-primary rounded-md px-2.5 py-1 h-full flex items-center text-sm">
                                      <span>{effectivePrice.toFixed(0)}</span>
                                  </div>
                                  <span className="px-2 text-[10px]">جنيه</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs"><span>مجاني!</span></div>
                              )}
                              {hasDiscount && (
                                  <span className="text-sm font-medium text-muted-foreground/60 diagonal-strike whitespace-nowrap">{course.price.toFixed(0)} ج</span>
                              )}
                          </div>
                          {course.createdAt && (
                              <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                      {toArabicDigits(format(new Date(course.createdAt), 'd MMMM yyyy', { locale: arSA }))}
                                  </span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
            );
          })}
        </div>
      )}

      <CourseSubscribersDialog 
        course={dialogState?.type === 'subscribers' ? dialogState.course : null} 
        isOpen={dialogState?.type === 'subscribers'} 
        onOpenChange={(open) => { if(!open) setDialogState(null); }} 
      />

      <AlertDialog open={dialogState?.type === 'delete'} onOpenChange={(open) => { if(!open) setDialogState(null); }}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيؤدي هذا إلى حذف الكورس وجميع محتوياته بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
