'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Course } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Clock, ImageIcon, Search, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
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
import { LoadingAnimation } from '@/components/ui/loading-animation';


const gradeMap: Record<Course['grade'], string> = {
  first_secondary: 'الصف الأول الثانوي',
  second_secondary: 'الصف الثاني الثانوي',
  third_secondary: 'الصف الثالث الثانوي',
};

export default function AdminCoursesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('all');
  const [dialogState, setDialogState] = React.useState<{ type: 'delete'; course: Course } | null>(null);
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
          <CardDescription className="text-right">ابحث عن كورس محدد أو قم بالفلترة حسب الصف الدراسي.</CardDescription>
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
                  <div className="absolute top-3 right-3 flex flex-col gap-2 z-30">
                      <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className='h-8 w-8 bg-card/90 backdrop-blur shadow-sm' onClick={() => handleTogglePublish(course)}>
                                  {course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{course.isPublished ? "إخفاء عن الطلاب" : "إظهار للطلاب"}</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" className='h-8 w-8 shadow-sm' onClick={() => setDialogState({ type: 'delete', course })}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>حذف الكورس</p></TooltipContent>
                      </Tooltip>
                  </div>
                  
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
                          <div className="w-full mt-4">
                              <Button variant="outline" className='h-11 text-sm w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold' onClick={() => router.push(`/admin/dashboard/courses/${course.id}`)}>إدارة الكورس</Button>
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
      <AlertDialog open={dialogState?.type === 'delete'} onOpenChange={(open) => !open && setDialogState(null)}>
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
