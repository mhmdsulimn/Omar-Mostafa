
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, FileText, Video, Award, LayoutList, Loader2, Link as LinkIcon, Lock } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, writeBatch, where } from 'firebase/firestore';
import type { Course, Lecture, LectureContent, Student, StudentCourse } from '@/lib/data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { SecureVideoPlayer } from '@/components/common/secure-video-player';
import { LoadingAnimation } from '@/components/ui/loading-animation';


const contentIconMap: Record<LectureContent['type'], React.ElementType> = {
    video: Video,
    pdf: FileText,
    quiz: Award,
    assignment: Book,
    link: LinkIcon,
};

function LectureAccordionItem({ 
    lecture, 
    courseId, 
    onContentClick, 
    isSubscribed 
}: { 
    lecture: Lecture; 
    courseId: string; 
    onContentClick: (content: LectureContent) => void;
    isSubscribed: boolean;
}) {
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    
    // جلب المحتويات مع فلترة العناصر المخفية للطلاب
    const contentsQuery = useMemoFirebase(
        () => (firestore && user) ? query(
            collection(firestore, `courses/${courseId}/lectures/${lecture.id}/contents`), 
            where('isHidden', '==', false),
            orderBy('order')
        ) : null,
        [firestore, user, courseId, lecture.id]
    );
    const { data: contents, isLoading: isLoadingContents } = useCollection<LectureContent>(contentsQuery, { ignorePermissionErrors: true });
    
    const handleContentClick = (content: LectureContent) => {
        if (!isSubscribed) {
            onContentClick(content); // This will trigger the subscription prompt in the parent
            return;
        }

        if ((content.type === 'quiz' || content.type === 'assignment') && content.linkedExamId) {
            router.push(`/exam/${content.linkedExamId}?courseId=${courseId}&lectureContentId=${content.id}`);
        } else {
            onContentClick(content);
        }
    }

    return (
        <AccordionItem value={lecture.id} key={lecture.id}>
            <AccordionTrigger className="rounded-lg hover:no-underline hover:bg-muted/50 p-4">
            <div className="flex items-center gap-4 text-right">
                <LayoutList className="h-6 w-6 text-primary" />
                <div>
                <h4 className="font-bold">{lecture.title}</h4>
                <p className="text-xs text-muted-foreground">{lecture.description}</p>
                </div>
            </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-muted/20 border-t">
            {isLoadingContents ? (
                <div className="flex h-24 w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : contents && contents.length > 0 ? (
                <div className="space-y-2">
                {contents.map((content) => {
                    const Icon = contentIconMap[content.type] || Book;
                    return (
                        <div key={content.id} className="flex justify-between items-center bg-card p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-primary"/>
                                <span className="font-semibold">{content.title}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleContentClick(content)}>
                                {!isSubscribed ? (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    content.type === 'quiz' || content.type === 'assignment' ? 'بدء' : 'عرض'
                                )}
                            </Button>
                        </div>
                    )
                })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-4">
                سيتم إضافة محتويات هذه المحاضرة قريبًا.
                </p>
            )}
            </AccordionContent>
        </AccordionItem>
    );
}

function CourseCurriculum({ 
    courseId, 
    onContentSelect, 
    isSubscribed 
}: { 
    courseId: string; 
    onContentSelect: (content: LectureContent | null) => void;
    isSubscribed: boolean;
}) {
    const firestore = useFirestore();
    const { user } = useUser();
    
    // جلب المحاضرات مع فلترة العناصر المخفية للطلاب
    const lecturesQuery = useMemoFirebase(
        () => (firestore && user && courseId) ? query(
            collection(firestore, `courses/${courseId}/lectures`), 
            where('isHidden', '==', false),
            orderBy('order')
        ) : null,
        [firestore, user, courseId]
    );
    const { data: lectures, isLoading: isLoadingLectures } = useCollection<Lecture>(lecturesQuery, { ignorePermissionErrors: true });

    const handleContentClick = (content: LectureContent) => {
        if (!isSubscribed) {
            onContentSelect(null); // This triggers the subscribe dialog in the main component
            return;
        }

        if (content.type === 'pdf' && content.pdfUrl) {
            window.open(content.pdfUrl, '_blank', 'noopener,noreferrer');
            onContentSelect(null);
        } else if (content.type === 'link' && content.externalUrl) {
            window.open(content.externalUrl, '_blank', 'noopener,noreferrer');
            onContentSelect(null);
        } else {
            onContentSelect(content);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    if (isLoadingLectures) {
        return (
            <div className="flex h-40 w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <Card className="rounded-2xl shadow-lg mt-8">
            <CardHeader>
                <CardTitle>محتوى الكورس</CardTitle>
            </CardHeader>
            <CardContent>
                {lectures && lectures.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {lectures.map((lecture) => (
                            <LectureAccordionItem
                                key={lecture.id}
                                lecture={lecture}
                                courseId={courseId}
                                onContentClick={handleContentClick}
                                isSubscribed={isSubscribed}
                            />
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-center text-muted-foreground py-10">
                        لا توجد محاضرات في هذا الكورس بعد.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}


export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = React.use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedContent, setSelectedContent] = React.useState<LectureContent | null>(null);
  const [showSubscribeDialog, setShowSubscribeDialog] = React.useState(false);
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  const courseDocRef = useMemoFirebase(
    () => (firestore && user && courseId ? doc(firestore, 'courses', courseId) : null),
    [firestore, user, courseId]
  );
  const { data: course, isLoading } = useDoc<Course>(courseDocRef);
  
  const userDocRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(userDocRef);

  const studentCourseDocRef = useMemoFirebase(
    () => (firestore && user && courseId) ? doc(firestore, 'users', user.uid, 'studentCourses', courseId) : null,
    [firestore, user, courseId]
  );
  const { data: subscription, isLoading: isLoadingSubscription } = useDoc(studentCourseDocRef);
  const isSubscribed = !!subscription;

  const handleSubscribe = async () => {
    if (!firestore || !user || !studentData || !course) return;

    const hasDiscount = !!course.discountPrice && course.discountPrice > 0;
    const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));
    
    const currentBalance = studentData.balance || 0;

    if (currentBalance < effectivePrice) {
        toast({
            variant: 'destructive',
            title: 'رصيد غير كافٍ',
            description: `رصيدك الحالي ${currentBalance} جنيه. أنت بحاجة إلى ${effectivePrice} جنيه للاشتراك.`,
        });
        setShowSubscribeDialog(false);
        return;
    }
    
    setIsSubscribing(true);
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

        // 1. Update student balance
        batch.update(userRef, { balance: newBalance });

        // 2. Create subscription record
        const studentCourseRef = doc(firestore, 'users', user.uid, 'studentCourses', course.id);
        batch.set(studentCourseRef, studentCourseData);
        
        await batch.commit();

        toast({
            title: 'تم الاشتراك بنجاح!',
            description: `لقد اشتركت في كورس "${course.title}".`,
        });

    } catch (error) {
        console.error("Subscription failed:", error);
        toast({
            variant: 'destructive',
            title: 'فشل الاشتراك',
            description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
        });
    } finally {
        setIsSubscribing(false);
        setShowSubscribeDialog(false);
    }
  };


  if (isLoading || isLoadingSubscription || isLoadingStudent) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  if (!course) {
    return <div>لم يتم العثور على الكورس.</div>;
  }
  
  const hasDiscount = !!course.discountPrice && course.discountPrice > 0;
  const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));

  const getDialogDescription = () => {
    if (effectivePrice === 0) {
      return `هل أنت متأكد أنك تريد الاشتراك في كورس "${course.title}" المجاني؟`;
    }
    return `سيتم خصم ${effectivePrice} جنيه من رصيدك للاشتراك في كورس "${course.title}". الرصيد الحالي: ${studentData?.balance || 0} جنيه.`;
  };


  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span>الرجوع</span>
        </Button>
      </div>

       {isSubscribed && selectedContent && selectedContent.type === 'video' && selectedContent.videoUrl ? (
            <div className="mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-right mb-4">{selectedContent.title}</h2>
                <SecureVideoPlayer videoUrl={selectedContent.videoUrl} />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-8">
                <div className="md:col-span-2">
                    <Card className="rounded-2xl shadow-lg flex items-center justify-center h-full">
                        <CardContent className="p-6 flex flex-col items-end justify-center text-right w-full">
                            <div className="w-full text-right space-y-2">
                                <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 mb-4 rounded-full ml-auto"></div>
                                <h2 className="text-3xl font-bold mb-2 text-right">{course.title}</h2>
                                <div className="w-32 h-0.5 bg-gray-200 dark:bg-gray-700 my-2 rounded-full ml-auto"></div>
                                <div className="w-24 h-0.5 bg-gray-200 dark:bg-gray-700 mb-4 rounded-full ml-auto"></div>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                    {course.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card className="overflow-hidden rounded-2xl shadow-lg h-full">
                        <div className="p-6 space-y-4">
                             <div className="flex flex-col items-center justify-center gap-2">
                                {effectivePrice > 0 ? (
                                    <div className="flex items-baseline gap-4">
                                        <div className="inline-flex items-center justify-center bg-primary rounded-md text-primary-foreground font-bold text-lg p-1">
                                            <div className="bg-primary-foreground text-primary rounded-sm px-4 py-2">
                                                <span>{effectivePrice.toFixed(0)}</span>
                                            </div>
                                            <span className="px-4">جنيهاً</span>
                                        </div>
                                        {hasDiscount && <span className="text-sm font-medium text-muted-foreground/60 diagonal-strike whitespace-nowrap">{course.price.toFixed(0)} ج</span>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl text-white font-black text-lg p-3">
                                        <span>كورس مجاني!</span>
                                    </div>
                                )}
                            </div>
                            {isSubscribed ? (
                               <Button className="w-full h-12" disabled>تم الاشتراك</Button>
                            ) : (
                               <Button
                                className="w-full h-12 text-base font-bold"
                                onClick={() => setShowSubscribeDialog(true)}>
                                    {effectivePrice > 0 ? 'اشترك الآن !' : 'اشترك مجاناً'}
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        )}

       <CourseCurriculum 
            courseId={courseId} 
            onContentSelect={(content) => {
                if (!isSubscribed) {
                    setShowSubscribeDialog(true);
                } else if (content) {
                    setSelectedContent(content);
                }
            }} 
            isSubscribed={isSubscribed}
        />

        <AlertDialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد الاشتراك</AlertDialogTitle>
                    <AlertDialogDescription>
                        {getDialogDescription()}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubscribing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubscribe} disabled={isSubscribing || (studentData?.balance ?? 0) < effectivePrice}>
                       {isSubscribing && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                       {isSubscribing ? 'جارِ الاشتراك...' : 'تأكيد'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
