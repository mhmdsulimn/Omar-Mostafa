'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useDoc, updateDocumentNonBlocking, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Exam } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LoadingAnimation } from '@/components/ui/loading-animation';

type ExamFormData = Omit<Exam, 'id' | 'questionCount'>;

function EditExamForm({ exam }: { exam: Exam }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const examId = exam.id;

  const [formData, setFormData] = React.useState<ExamFormData>({
    title: exam.title,
    description: exam.description,
    duration: exam.duration,
    grade: exam.grade,
    allowRetakes: exam.allowRetakes,
    isPrivate: exam.isPrivate || false,
    rewardThreshold: exam.rewardThreshold || 0,
    rewardAmount: exam.rewardAmount || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !examId) return;

    setIsSaving(true);
    try {
      const examDocRef = doc(firestore, 'exams', examId);
      await updateDocumentNonBlocking(examDocRef, { ...formData });
      toast({ title: 'تم تحديث الامتحان بنجاح.' });
      router.push('/admin/dashboard/exams');
    } catch (error) {
      console.error("Error updating exam:", error);
      toast({ title: 'حدث خطأ أثناء تحديث الامتحان.', variant: 'destructive' });
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSaveChanges}>
        <CardHeader>
          <CardTitle>تعديل الامتحان</CardTitle>
          <CardDescription>قم بتعديل تفاصيل الامتحان هنا.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">العنوان</Label>
            <Input id="title" value={formData.title} onChange={handleChange} required disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea id="description" value={formData.description} onChange={handleChange} required disabled={isSaving} />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className="space-y-2">
              <Label htmlFor="duration">المدة (دقائق)</Label>
              <Input id="duration" type="number" value={formData.duration} onChange={(e) => setFormData((prev) => ({ ...prev, duration: Number(e.target.value) }))} required disabled={isSaving} min="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Select dir="rtl" value={formData.grade} onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value as Exam['grade'] }))} disabled={isSaving || formData.isPrivate}>
                <SelectTrigger id="grade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                  <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                  <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch id="allow-retakes" checked={formData.allowRetakes} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowRetakes: checked }))} disabled={isSaving} />
              <Label htmlFor="allow-retakes" className="cursor-pointer">السماح بإعادة المحاولة</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is-private" checked={formData.isPrivate} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))} disabled={isSaving} />
              <Label htmlFor="is-private" className="cursor-pointer">خاص بالكورس (مخفي)</Label>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4'>
            <div className="space-y-2">
              <Label htmlFor="rewardThreshold">حد المكافأة (0-100)%</Label>
              <Input id="rewardThreshold" type="number" value={formData.rewardThreshold || ''} onChange={(e) => setFormData((prev) => ({ ...prev, rewardThreshold: Number(e.target.value) }))} placeholder="مثال: 90" disabled={isSaving} min="0" max="100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rewardAmount">مبلغ المكافأة (جنيه)</Label>
              <Input id="rewardAmount" type="number" value={formData.rewardAmount || ''} onChange={(e) => setFormData((prev) => ({ ...prev, rewardAmount: Number(e.target.value) }))} placeholder="مثال: 10" disabled={isSaving} min="0" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/dashboard/exams')}>إلغاء</Button>
            <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ التغييرات
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}


export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = React.use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const examDocRef = useMemoFirebase(
    () => (firestore && user && examId ? doc(firestore, 'exams', examId) : null),
    [firestore, user, examId]
  );
  const { data: exam, isLoading } = useDoc<Exam>(examDocRef);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
        <LoadingAnimation size="md" />
      </div>
    );
  }

  if (!exam) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>خطأ</CardTitle>
                <CardDescription>لم يتم العثور على الاختبار المطلوب.</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={() => router.push('/admin/dashboard/exams')}>العودة إلى قائمة الاختبارات</Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" className="h-7 w-7 gap-1" onClick={() => router.push('/admin/dashboard/exams')}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-lg font-semibold md:text-2xl">تعديل الامتحان</h1>
      </div>
      <EditExamForm exam={exam} />
    </>
  );
}
