'use client';

import * as React from 'react';
import type { Course, Student, StudentCourse } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ImageIcon, Search, Clock, Library } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { toArabicDigits, cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function StudentCoursesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [priceFilter, setPriceFilter] = React.useState('all');
  const [dialogState, setDialogState] = React.useState<{type: 'subscribe', course: Course} | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(userDocRef);

  const allCoursesQuery = useMemoFirebase(
    () => (firestore && studentData?.grade ? 
        query(
            collection(firestore, 'courses'), 
            where('grade', '==', studentData.grade),
            where('isPublished', '==', true) 
        ) 
        : null),
    [firestore, studentData]
  );
  const { data: allCourses, isLoading: isLoadingCourses } = useCollection<Course>(allCoursesQuery);

  const studentCoursesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users', user.uid, 'studentCourses') : null),
    [firestore, user]
  );
  const { data: studentCourses, isLoading: isLoadingStudentCourses } = useCollection<StudentCourse>(studentCoursesQuery);
  
  const subscribedCoursesMap = React.useMemo(() => {
    if (!studentCourses) return new Map();
    return new Map(studentCourses.map(sc => [sc.courseId, sc]));
  }, [studentCourses]);


  const handleSubscribe = async () => {
    if (!firestore || !user || !studentData || !dialogState || dialogState.type !== 'subscribe') return;

    const course = dialogState.course;
    const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));
    const currentBalance = studentData.balance || 0;

    if (currentBalance < effectivePrice) {
        toast({
            variant: 'destructive',
            title: 'رصيد غير كافٍ',
            description: `رصيدك الحالي ${currentBalance} جنيه. أنت بحاجة إلى ${effectivePrice} جنيه للاشتراك.`,
        });
        setDialogState(null);
        return;
    }
    
    setIsProcessing(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const newBalance = currentBalance - effectivePrice;
        
        const studentCourseData: Omit<StudentCourse, 'id'> = {
            studentId: user.uid,
            courseId: course.id,
            purchaseDate: new Date().toISOString(),
            pricePaid: effectivePrice,
        };
        
        const batch = writeBatch(firestore);
        
        // 1. تحديث الرصيد
        batch.update(userRef, { balance: newBalance });
        
        // 2. تسجيل الاشتراك
        const studentCourseRef = doc(firestore, 'users', user.uid, 'studentCourses', course.id);
        batch.set(studentCourseRef, studentCourseData);

        // 3. إضافة إشعار محلي
        const notificationRef = doc(collection(firestore, `users/${user.uid}/notifications`));
        batch.set(notificationRef, {
            message: `تم الاشتراك بنجاح في كورس "${course.title}". تم خصم ${effectivePrice} جنيه من رصيدك.`,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'wallet',
            link: '/dashboard/wallet'
        });

        await batch.commit()
          .then(() => {
            toast({ title: 'تم الاشتراك بنجاح!', description: `لقد اشتركت في كورس "${course.title}".` });
          })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: `users/${user.uid}/studentCourses/${course.id}`,
              operation: 'write',
              requestResourceData: studentCourseData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });

    } catch (error) {
        console.error("Subscription flow error:", error);
        toast({ variant: 'destructive', title: 'فشل الاشتراك', description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
    } finally {
        setIsProcessing(false);
        setDialogState(null);
    }
  };

  const isLoading = isLoadingStudent || isLoadingCourses || isLoadingStudentCourses;

  const sortedCourses = React.useMemo(() => {
    return allCourses?.sort((a, b) => a.title.localeCompare(b.title)) ?? [];
  }, [allCourses]);

  const filteredCourses = React.useMemo(() => {
    return sortedCourses.filter(course => {
      const searchMatch = !searchTerm ||
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;
      const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));
      if (priceFilter === 'free') return effectivePrice === 0;
      if (priceFilter === 'paid') return effectivePrice > 0;
      return true;
    });
  }, [sortedCourses, searchTerm, priceFilter]);
  
  const getDialogDescription = () => {
    if (!dialogState) return '';
    const course = dialogState.course;
    const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));
    if (effectivePrice === 0) return `هل أنت متأكد أنك تريد الاشتراك في كورس "${course.title}" المجاني؟`;
    return `سيتم خصم ${effectivePrice} جنيه من رصيدك للاشتراك في كورس "${course.title}". الرصيد الحالي: ${studentData?.balance || 0} جنيه.`;
  };

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
        <h1 className="text-lg font-semibold md:text-2xl text-right text-primary">تصفح الكورسات</h1>
      </div>

       <Card className='mb-6 border-none shadow-sm md:shadow-md bg-muted/20 md:bg-card'>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-right text-base md:text-lg">بحث وفلترة</CardTitle>
          <CardDescription className="text-right">ابحث عن كورس أو قم بالفلترة حسب السعر.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو الوصف..."
                className="pr-8 text-right bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select dir="rtl" value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="فلترة بالسعر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="free">الكورسات المجانية</SelectItem>
                <SelectItem value="paid">الكورسات المدفوعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

       {filteredCourses.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/10">
                <Library className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد كورسات متاحة'}</h3>
                <p className="text-muted-foreground mt-2">{searchTerm ? 'جرّب البحث بكلمات أخرى.' : 'لا توجد كورسات متاحة لصفك الدراسي حالياً.'}</p>
            </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center lg:justify-start animate-fade-in">
          {filteredCourses.map((course) => {
            const isSubscribed = subscribedCoursesMap.has(course.id);
            const hasDiscount = !!course.discountPrice && course.discountPrice > 0;
            const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));
            
            return (
             <div key={course.id} className="relative transition-all duration-300 w-full sm:w-[420px] shrink-0 group">
                <div className="relative aspect-video w-full rounded-2xl bg-muted flex items-center justify-center overflow-hidden shadow-lg border">
                    {course.thumbnailUrl ? (
                        <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                        <ImageIcon className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
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
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button onClick={() => router.push(`/dashboard/courses/${course.id}`)} variant="outline" className='h-11 text-sm w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold'>التفاصيل</Button>
                           {isSubscribed ? (
                                <Button onClick={() => router.push(`/dashboard/courses/${course.id}`)} className="h-11 text-sm w-full font-bold">دخول</Button>
                           ) : (
                                <Button onClick={() => setDialogState({ type: 'subscribe', course })} className="h-11 text-sm w-full font-bold">
                                    {effectivePrice > 0 ? 'اشترك الآن' : 'اشترك مجاناً'}
                                </Button>
                           )}
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
                                <span>{toArabicDigits(format(new Date(course.createdAt), 'd MMM yyyy', { locale: arSA }))}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )
          })}
          </div>
        )}
        <AlertDialog open={!!dialogState} onOpenChange={(open) => !open && setDialogState(null)}>
            <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-right">تأكيد الاشتراك</AlertDialogTitle>
                    <AlertDialogDescription className="text-right">{getDialogDescription()}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleSubscribe}
                        disabled={isProcessing || (dialogState?.type === 'subscribe' && (studentData?.balance ?? 0) < Math.max(0, dialogState.course.price - (dialogState.course.discountPrice || 0)))}
                    >
                       {isProcessing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                       تأكيد
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
