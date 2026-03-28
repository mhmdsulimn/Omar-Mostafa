
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useFirestore, addDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react';
import type { Course, AppSettings } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImageUpload, uploadToImgBB } from '@/components/common/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CourseFormData = {
  title: string;
  description: string;
  grade: Course['grade'];
  thumbnailUrl: string;
  price: number | null;
  discountPrice: number | null;
  isPublished: boolean;
};

export default function NewCoursePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingImage, setPendingImage] = React.useState<File | null>(null);

  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

  const [formData, setFormData] = React.useState<CourseFormData>({
    title: '',
    description: '',
    grade: 'first_secondary',
    thumbnailUrl: '',
    price: null,
    discountPrice: null,
    isPublished: true,
  });

  const coursesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'courses') : null),
    [firestore]
  );
  
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({...prev, [id]: value === '' ? null : Number(value)}));
  }

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !coursesCollection || formData.price === null) {
      toast({ title: 'فشل الإنشاء', description: 'يرجى ملء جميع الحقول المطلوبة والتأكد من السعر.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);

    try {
      let finalImageUrl = formData.thumbnailUrl;

      if (pendingImage) {
        try {
          finalImageUrl = await uploadToImgBB(pendingImage, appSettings?.imgbbApiKey);
        } catch (uploadError: any) {
          toast({ variant: 'destructive', title: 'فشل رفع الصورة المرفقة', description: uploadError.message });
          setIsSaving(false);
          return;
        }
      }

      const dataToSave: Omit<Course, 'id'> & { [key: string]: any } = {
          title: formData.title,
          description: formData.description,
          grade: formData.grade,
          price: Number(formData.price),
          isPublished: formData.isPublished,
          createdAt: new Date().toISOString(),
          thumbnailUrl: finalImageUrl || '',
      };

      if (formData.discountPrice !== null && formData.discountPrice >= 0) {
          dataToSave.discountPrice = Number(formData.discountPrice);
      }
      
      const newDocRef = await addDocumentNonBlocking(coursesCollection, dataToSave);
      toast({ title: 'تم إنشاء الكورس بنجاح.' });
      router.push(`/admin/dashboard/courses/${newDocRef.id}`);
    } catch (error) {
      console.error("Error creating course:", error);
      toast({ title: 'حدث خطأ أثناء إنشاء الكورس.', variant: 'destructive' });
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span>الرجوع</span>
        </Button>
        <h1 className="text-lg font-semibold md:text-2xl">إضافة كورس جديد</h1>
      </div>
      <Card className="max-w-4xl mx-auto rounded-2xl shadow-xl overflow-hidden">
        <form onSubmit={handleSaveAndContinue}>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>تفاصيل الكورس</span>
            </CardTitle>
            <CardDescription>
              املأ تفاصيل الكورس. ملاحظة: إذا اخترت صورة من الجهاز فسيتم اعتمادها وتجاهل الرابط الخارجي عند الحفظ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
                <Label htmlFor="title">العنوان</Label>
                <Input id="title" value={formData.title} onChange={handleTextChange} required disabled={isSaving} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea id="description" value={formData.description} onChange={handleTextChange} required disabled={isSaving} className="rounded-xl min-h-[100px]" />
            </div>
            
            <div className="space-y-4">
                <Label className="text-sm font-bold opacity-80">صورة غلاف الكورس</Label>
                <Tabs defaultValue="upload" className="w-full" dir="rtl">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 h-11 rounded-xl">
                        <TabsTrigger value="upload" className="rounded-lg transition-all">رفع من الجهاز</TabsTrigger>
                        <TabsTrigger value="link" className="rounded-lg transition-all">رابط خارجي</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-0">
                        <ImageUpload 
                            onImageSelect={setPendingImage}
                            defaultValue={formData.thumbnailUrl}
                        />
                    </TabsContent>
                    <TabsContent value="link" className="mt-0 space-y-2">
                        <div className="relative">
                            <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="thumbnailUrl" 
                                value={formData.thumbnailUrl} 
                                onChange={handleTextChange} 
                                disabled={isSaving} 
                                dir="ltr" 
                                className="text-left pr-10 rounded-xl h-11" 
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">سيتم تجاهل هذا الرابط إذا قمت باختيار صورة من الجهاز في التبويب الآخر.</p>
                    </TabsContent>
                </Tabs>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">السعر الأصلي (جنيه)</Label>
                    <Input id="price" type="number" value={formData.price ?? ''} onChange={handleNumberChange} required disabled={isSaving} min="0" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="discountPrice">قيمة الخصم (اختياري)</Label>
                    <Input id="discountPrice" type="number" value={formData.discountPrice ?? ''} onChange={handleNumberChange} disabled={isSaving} min="0" className="rounded-xl h-11" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="grade">الصف الدراسي</Label>
                <Select dir="rtl" value={formData.grade} onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value as Course['grade'] }))} disabled={isSaving}>
                <SelectTrigger id="grade" className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse pt-4 border-t">
                <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData(prev => ({...prev, isPublished: checked}))}
                disabled={isSaving}
                />
                <Label htmlFor="isPublished" className="cursor-pointer">نشر الكورس فوراً للطلاب</Label>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button type="submit" disabled={isSaving || formData.price === null || !formData.title} className="w-full h-12 text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]">
              {isSaving ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جارِ الحفظ والرفع...
                </>
              ) : 'حفظ الكورس والمتابعة'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
