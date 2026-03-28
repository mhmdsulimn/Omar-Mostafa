'use client';

import * as React from 'react';
import type { Course, StudentCourse } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ImageIcon, Clock, Library, Search } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { toArabicDigits, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function MyCoursesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [priceFilter, setPriceFilter] = React.useState('all');

  const studentCoursesQuery = useMemoFirebase(
    () => (firestore && user) ? collection(firestore, 'users', user.uid, 'studentCourses') : null,
    [firestore, user]
  );
  const { data: studentCourses, isLoading: isLoadingStudentCourses } = useCollection<StudentCourse>(studentCoursesQuery);

  const subscribedCourseIds = React.useMemo(() => {
    return studentCourses?.map(sc => sc.courseId).filter(id => !!id) || [];
  }, [studentCourses]);
  
  const subscribedCoursesQuery = useMemoFirebase(
    () => {
      if (!firestore || !user || subscribedCourseIds.length === 0) {
        return null;
      }
      return query(
        collection(firestore, 'courses'), 
        where(documentId(), 'in', subscribedCourseIds),
        where('isPublished', '==', true)
      );
    },
    [firestore, user, subscribedCourseIds]
  );
  const { data: subscribedCourses, isLoading: isLoadingCourses } = useCollection<Course>(subscribedCoursesQuery);
  
  const isLoading = isLoadingStudentCourses || (subscribedCourseIds.length > 0 && isLoadingCourses);

  const filteredCourses = React.useMemo(() => {
    if (!subscribedCourses) return [];

    return subscribedCourses.filter(course => {
      const subscriptionRecord = studentCourses?.find(sc => sc.courseId === course.id);
      const pricePaid = subscriptionRecord?.pricePaid ?? 0;

      const searchMatch = !searchTerm ||
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;
      if (priceFilter === 'free') return pricePaid === 0;
      if (priceFilter === 'paid') return pricePaid > 0;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subscribedCourses, studentCourses, searchTerm, priceFilter]);

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
        <h1 className="text-lg font-semibold md:text-2xl text-right">كورساتي</h1>
      </div>

       <Card className='mb-6'>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-right">بحث وفلترة</CardTitle>
          <CardDescription className="text-right">ابحث في كورساتك المشترك بها.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو الوصف..."
                className="pr-8 text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select dir="rtl" value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="فلترة بالسعر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="free">المجانية</SelectItem>
                <SelectItem value="paid">المدفوعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

       {filteredCourses.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <Library className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{searchTerm || priceFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لم تشترك في أي كورس بعد'}</h3>
                <p className="text-muted-foreground mt-2">تصفح الكورسات المتاحة وابدأ رحلتك التعليمية.</p>
                {(!searchTerm && priceFilter === 'all') && (
                  <Button className="mt-4" onClick={() => router.push('/dashboard/courses')}>تصفح الكورسات</Button>
                )}
            </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center lg:justify-start">
          {filteredCourses.map((course) => {
            const subscriptionRecord = studentCourses?.find(sc => sc.courseId === course.id);
            const pricePaid = subscriptionRecord?.pricePaid ?? 0;
            const hasDiscount = pricePaid < course.price;

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
                        <Button onClick={() => router.push(`/dashboard/courses/${course.id}`)} variant="outline" className='h-11 text-base border border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full mt-4 font-bold shadow-sm'>
                            ادخل الكورس
                        </Button>
                    </div>

                     <div className="border-t my-2"></div>

                     <div className="flex w-full justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                            {pricePaid > 0 ? (
                                <div className="inline-flex items-center justify-between bg-primary rounded-xl text-primary-foreground font-bold p-1 h-9 shadow-md shadow-primary/20">
                                  <div className="bg-primary-foreground text-primary rounded-md px-2.5 py-1 h-full flex items-center text-sm">
                                      <span>{pricePaid.toFixed(0)}</span>
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
    </>
  );
}
