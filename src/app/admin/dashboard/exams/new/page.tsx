'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, addDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Exam, Course } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type ExamFormData = Omit<Exam, 'id'>;

export default function NewExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const courseId = searchParams.get('courseId');

  const courseDocRef = useMemoFirebase(
    () => (firestore && courseId ? doc(firestore, 'courses', courseId) : null),
    [firestore, courseId]
  );
  const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseDocRef);

  const [formData, setFormData] = React.useState<ExamFormData>({
    title: '',
    description: '',
    duration: 60,
    grade: 'first_secondary',
    allowRetakes: false,
    questionCount: 0,
    isPrivate: !!courseId, // Default to private if created from a course
    rewardThreshold: 0,
    rewardAmount: 0,
  });

  React.useEffect(() => {
    // If we are creating an exam for a course, automatically set the grade
    // and make it private.
    if (course) {
      setFormData(prev => ({
        ...prev,
        grade: course.grade,
        isPrivate: true,
      }));
    }
  }, [course]);

  const examsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'exams') : null),
    [firestore]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !examsCollection) {
      toast({ title: 'فشل الاتصال بقاعدة البيانات.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
      // Final check to ensure grade is set from course if courseId exists
      const finalData = { ...formData };
      if (course) {
          finalData.grade = course.grade;
      }
        
      const newDocRef = await addDocumentNonBlocking(examsCollection, finalData);
      toast({ title: 'تم إنشاء الامتحان بنجاح.' });

      // If created from a course, go back to the course page.
      if (courseId) {
        // We need to pass back the new examId to the course page, but router.back() doesn't support that.
        // A robust solution would involve state management (like Zustand/Redux) or a query param refresh.
        // For now, we'll just go back. The user will have to manually select the new exam.
        // Or even better, we redirect to the questions page.
         router.push(`/admin/dashboard/exams/${newDocRef.id}/questions?courseId=${courseId}`);
      } else {
        router.push(`/admin/dashboard/exams/${newDocRef.id}/questions`);
      }
    } catch (error) {
      console.error("Error creating exam:", error);
      toast({ title: 'حدث خطأ أثناء إنشاء الامتحان.', variant: 'destructive' });
      setIsSaving(false);
    } 
  };
  
  const handleBackNavigation = () => {
    if(courseId) {
        router.push(`/admin/dashboard/courses/${courseId}`);
    } else {
        router.back();
    }
  }

  if (isLoadingCourse) {
      return (
           <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
      )
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
         <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleBackNavigation}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        <h1 className="text-lg font-semibold md:text-2xl">إضافة امتحان جديد</h1>
      </div>
      <Card>
        <form onSubmit={handleSaveAndContinue}>
          <CardHeader>
            <CardTitle>تفاصيل الامتحان</CardTitle>
            <CardDescription>
              املأ تفاصيل الامتحان الجديد. يمكنك إضافة أسئلة بعد إنشائه.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">العنوان</Label>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={handleChange} 
                placeholder="" 
                required 
                disabled={isSaving} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={handleChange} 
                placeholder="وصف موجز للامتحان." 
                required 
                disabled={isSaving} 
              />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className="space-y-2">
                <Label htmlFor="duration">المدة (دقائق)</Label>
                <Input 
                    id="duration" 
                    type="number" 
                    value={formData.duration} 
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: Number(e.target.value) }))} 
                    placeholder="بالدقائق" 
                    required 
                    disabled={isSaving} 
                    min="1" 
                />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="grade">الصف الدراسي</Label>
                    <Select dir="rtl" value={formData.grade} onValueChange={(value) => setFormData(prev => ({...prev, grade: value as Exam['grade']}))} disabled={isSaving || !!course || formData.isPrivate}>
                        <SelectTrigger id="grade">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                            <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                            <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch
                        id="allow-retakes"
                        checked={formData.allowRetakes}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowRetakes: checked }))}
                        disabled={isSaving}
                    />
                    <Label htmlFor="allow-retakes" className="cursor-pointer">السماح بإعادة المحاولة</Label>
                </div>
                 <div className="flex items-center gap-2">
                    <Switch
                        id="is-private"
                        checked={formData.isPrivate}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                        disabled={isSaving || !!courseId}
                    />
                    <Label htmlFor="is-private" className="cursor-pointer">خاص بالكورس (مخفي)</Label>
                </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4'>
                <div className="space-y-2">
                <Label htmlFor="rewardThreshold">حد المكافأة (0-100)%</Label>
                <Input 
                    id="rewardThreshold"
                    type="number"
                    value={formData.rewardThreshold || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rewardThreshold: Number(e.target.value) }))} 
                    placeholder="مثال: 90" 
                    disabled={isSaving} 
                    min="0"
                    max="100"
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="rewardAmount">مبلغ المكافأة (جنيه)</Label>
                <Input 
                    id="rewardAmount"
                    type="number"
                    value={formData.rewardAmount || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rewardAmount: Number(e.target.value) }))} 
                    placeholder="مثال: 10" 
                    disabled={isSaving} 
                    min="0"
                />
                </div>
            </div>
             <p className="text-sm text-muted-foreground">
              يمكنك ترك حقول المكافأة فارغة إذا كنت لا تريد منح مكافأة لهذا الاختبار.
            </p>
          </CardContent>
          <CardContent>
            <Button type="submit" disabled={isSaving || isLoadingCourse} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'جار الحفظ...' : 'حفظ ومتابعة لإضافة الأسئلة'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </>
  );
}
