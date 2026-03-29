'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Book,
  FileText,
  Video,
  Award,
  LayoutList,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import {
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { collection, doc, query, orderBy, deleteField } from 'firebase/firestore';
import type { Course, Lecture, LectureContent, Exam, AppSettings } from '@/lib/data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImageUpload, uploadToImgBB } from '@/components/common/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingAnimation } from '@/components/ui/loading-animation';

type CourseFormData = {
    title: string;
    description: string;
    grade: Course['grade'];
    thumbnailUrl: string;
    price: number | null;
    discountPrice: number | null;
    isPublished: boolean;
};

function EditCourseDialog({
    course,
    isOpen,
    onClose,
}: {
    course: Course;
    isOpen: boolean;
    onClose: () => void;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [pendingImage, setPendingImage] = React.useState<File | null>(null);

    const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
    const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

    const [formData, setFormData] = React.useState<CourseFormData>({
        title: course.title,
        description: course.description,
        grade: course.grade,
        thumbnailUrl: course.thumbnailUrl || '',
        price: course.price,
        discountPrice: course.discountPrice ?? null,
        isPublished: course.isPublished,
    });
    
    React.useEffect(() => {
        if(isOpen) {
            setFormData({
                title: course.title,
                description: course.description,
                grade: course.grade,
                thumbnailUrl: course.thumbnailUrl || '',
                price: course.price,
                discountPrice: course.discountPrice ?? null,
                isPublished: course.isPublished,
            });
            setPendingImage(null);
        }
    }, [isOpen, course]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value === '' ? null : Number(value) }));
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        setIsSaving(true);
        let finalImageUrl = formData.thumbnailUrl;

        if (pendingImage) {
            try {
                finalImageUrl = await uploadToImgBB(pendingImage, appSettings?.imgbbApiKey);
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'فشل رفع الصورة الجديدة', description: err.message });
                setIsSaving(false);
                return;
            }
        }

        const courseDocRef = doc(firestore, 'courses', course.id);
        const dataToUpdate: { [key: string]: any } = {
            title: formData.title,
            description: formData.description,
            grade: formData.grade,
            price: Number(formData.price) || 0,
            isPublished: formData.isPublished,
            thumbnailUrl: finalImageUrl || deleteField(),
        };

        if (formData.discountPrice !== null && formData.discountPrice >= 0) {
            dataToUpdate.discountPrice = Number(formData.discountPrice);
        } else {
            dataToUpdate.discountPrice = deleteField();
        }

        try {
            await updateDocumentNonBlocking(courseDocRef, dataToUpdate);
            toast({ title: 'تم تحديث الكورس بنجاح.' });
            onClose();
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل تحديث الكورس' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] rounded-2xl">
                <form onSubmit={handleUpdate}>
                    <DialogHeader>
                        <DialogTitle>تعديل الكورس</DialogTitle>
                        <DialogDescription>قم بتعديل بيانات الكورس. ملاحظة: الرفع من الجهاز سيتجاهل أي رابط خارجي تلقائياً.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">العنوان</Label>
                            <Input id="edit-title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">الوصف</Label>
                            <Textarea id="edit-description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} required disabled={isSaving} className="min-h-[100px]" />
                        </div>
                        
                        <div className="space-y-4 border-t pt-4">
                            <Label className="font-bold">صورة غلاف الكورس</Label>
                            <Tabs defaultValue="upload" className="w-full" dir="rtl">
                                <TabsList className="grid w-full grid-cols-2 mb-2 bg-muted/50 h-10 p-1">
                                    <TabsTrigger value="upload">رفع من الجهاز</TabsTrigger>
                                    <TabsTrigger value="link">رابط خارجي</TabsTrigger>
                                </TabsList>
                                <TabsContent value="upload" className="mt-0">
                                    <ImageUpload 
                                        onImageSelect={(file) => {
                                            setPendingImage(file);
                                            if (file === null) {
                                                setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
                                            }
                                        }}
                                        defaultValue={formData.thumbnailUrl}
                                    />
                                </TabsContent>
                                <TabsContent value="link" className="mt-0 space-y-2">
                                    <div className="relative">
                                        <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            id="edit-thumbnailUrl" 
                                            value={formData.thumbnailUrl} 
                                            onChange={e => setFormData(p => ({ ...p, thumbnailUrl: e.target.value }))} 
                                            disabled={isSaving} 
                                            dir="ltr" 
                                            className="text-left pr-10" 
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">السعر الأصلي</Label>
                                <Input id="price" type="number" value={formData.price ?? ''} onChange={handleNumberChange} required disabled={isSaving} min="0" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discountPrice">مقدار الخصم</Label>
                                <Input id="discountPrice" type="number" value={formData.discountPrice ?? ''} onChange={handleNumberChange} disabled={isSaving} min="0" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-grade">الصف الدراسي</Label>
                            <Select dir="rtl" value={formData.grade} onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value as Course['grade'] }))} disabled={isSaving}>
                                <SelectTrigger id="edit-grade"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                                    <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                                    <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse pt-4 border-t">
                            <Switch id="edit-isPublished" checked={formData.isPublished} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))} disabled={isSaving} />
                            <Label htmlFor="edit-isPublished" className="cursor-pointer">نشر الكورس للطلاب</Label>
                        </div>
                    </div>
                    <DialogFooter className="bg-muted/20 p-4 border-t -mx-6 -mb-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>إلغاء</Button>
                        <Button type="submit" disabled={isSaving || formData.price === null || !formData.title}>
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            حفظ والتطبيق
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function LectureForm({
    lecture,
    onSave,
    onClose,
    isSaving,
}: {
    lecture?: Lecture | null;
    onSave: (data: Omit<Lecture, 'id' | 'courseId' | 'order'>) => Promise<void>;
    onClose: () => void;
    isSaving: boolean;
}) {
    const [formData, setFormData] = React.useState({
        title: lecture?.title || '',
        description: lecture?.description || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{lecture ? 'تعديل المحاضرة' : 'إضافة محاضرة جديدة'}</DialogTitle>
                <DialogDescription>املأ تفاصيل المحاضرة.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="title">عنوان المحاضرة</Label>
                    <Input id="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">وصف المحاضرة</Label>
                    <Textarea id="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} required disabled={isSaving} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>إلغاء</Button>
                <Button type="submit" disabled={isSaving || !formData.title}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {lecture ? 'حفظ التغييرات' : 'إنشاء المحاضرة'}
                </Button>
            </DialogFooter>
        </form>
    );
}

type LectureContentFormData = Omit<LectureContent, 'id' | 'lectureId' | 'order'>;

function LectureContentForm({
    content,
    onSave,
    onClose,
    isSaving,
    allExams,
    courseId,
}: {
    content?: LectureContent | null;
    onSave: (data: LectureContentFormData) => Promise<void>;
    onClose: () => void;
    isSaving: boolean;
    allExams: Exam[];
    courseId: string;
}) {
    const router = useRouter();
    const [formData, setFormData] = React.useState<LectureContentFormData>({
        title: content?.title || '',
        type: content?.type || 'video',
        videoUrl: content?.videoUrl || '',
        pdfUrl: content?.pdfUrl || '',
        linkedExamId: content?.linkedExamId || '',
        externalUrl: content?.externalUrl || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave: Partial<LectureContent> = { title: formData.title, type: formData.type };

        if (formData.type === 'video') dataToSave.videoUrl = formData.videoUrl;
        if (formData.type === 'pdf') dataToSave.pdfUrl = formData.pdfUrl;
        if (formData.type === 'quiz' || formData.type === 'assignment') dataToSave.linkedExamId = formData.linkedExamId;
        if (formData.type === 'link') dataToSave.externalUrl = formData.externalUrl;

        await onSave(dataToSave as LectureContentFormData);
    };

    const examsForSelect = React.useMemo(() => {
        if (formData.type === 'assignment') {
            return allExams.filter(exam => exam.isPrivate);
        }
        return allExams;
    }, [allExams, formData.type]);

    const placeholderText = formData.type === 'assignment'
      ? 'اختر الواجب (الاختبارات الخاصة فقط)'
      : 'اختر الاختبار المطلوب';

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{content ? 'تعديل محتوى' : 'إضافة محتوى جديد'}</DialogTitle>
                <DialogDescription>املأ تفاصيل المحتوى.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="content-title">عنوان المحتوى</Label>
                    <Input id="content-title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required disabled={isSaving} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="content-type">نوع المحتوى</Label>
                    <Select dir="rtl" value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v as LectureContent['type'] }))} disabled={isSaving}>
                        <SelectTrigger id="content-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="video">فيديو</SelectItem>
                            <SelectItem value="pdf">ملف PDF</SelectItem>
                            <SelectItem value="quiz">اختبار</SelectItem>
                            <SelectItem value="assignment">واجب</SelectItem>
                            <SelectItem value="link">رابط خارجي</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 {formData.type === 'video' && (
                    <div className="space-y-2">
                        <Label htmlFor="videoUrl">رابط الفيديو</Label>
                        <div className="relative">
                            <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="videoUrl" value={formData.videoUrl || ''} onChange={e => setFormData(p => ({ ...p, videoUrl: e.target.value }))} required disabled={isSaving} className="text-left" dir="ltr" placeholder="https://www.youtube.com/embed/..." />
                        </div>
                    </div>
                )}
                {formData.type === 'pdf' && (
                    <div className="space-y-2">
                        <Label htmlFor="pdfUrl">رابط ملف PDF</Label>
                        <div className="relative">
                            <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="pdfUrl" value={formData.pdfUrl || ''} onChange={e => setFormData(p => ({ ...p, pdfUrl: e.target.value }))} required disabled={isSaving} className="text-left" dir="ltr" placeholder="https://example.com/file.pdf" />
                        </div>
                    </div>
                )}
                {formData.type === 'link' && (
                    <div className="space-y-2">
                        <Label htmlFor="externalUrl">الرابط الخارجي</Label>
                        <div className="relative">
                            <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="externalUrl" value={formData.externalUrl || ''} onChange={e => setFormData(p => ({ ...p, externalUrl: e.target.value }))} required disabled={isSaving} className="text-left" dir="ltr" placeholder="https://example.com" />
                        </div>
                    </div>
                )}
                {(formData.type === 'quiz' || formData.type === 'assignment') && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="linkedExamId">ربط بـ {formData.type === 'quiz' ? 'اختبار' : 'واجب'}</Label>
                             <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/admin/dashboard/exams/new?courseId=${courseId}`)}>
                                <PlusCircle className="ml-2 h-3.5 w-3.5" />
                                إنشاء جديد
                             </Button>
                        </div>
                        <Select dir="rtl" value={formData.linkedExamId} onValueChange={v => setFormData(p => ({ ...p, linkedExamId: v }))} disabled={isSaving}>
                            <SelectTrigger id="linkedExamId">
                                <SelectValue placeholder={placeholderText} />
                            </SelectTrigger>
                            <SelectContent>
                                {examsForSelect.length > 0 ? examsForSelect.map(exam => (
                                    <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
                                )) : <SelectItem value="none" disabled>لا توجد اختبارات متاحة لهذا الصف</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>إلغاء</Button>
                <Button type="submit" disabled={isSaving || !formData.title}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {content ? 'حفظ التغييرات' : 'إنشاء المحتوى'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function LectureContentItem({ content, onEdit, onDelete }: { content: LectureContent, onEdit: () => void, onDelete: () => void }) {
    const Icon = contentIconMap[content.type] || Book;
    return (
        <div className="flex justify-between items-center bg-card p-3 rounded-lg border">
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-semibold">{content.title}</span>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

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
    allExams,
    openEditLectureDialog,
    openDeleteLectureDialog,
}: {
    lecture: Lecture;
    courseId: string;
    allExams: Exam[];
    openEditLectureDialog: (lecture: Lecture) => void;
    openDeleteLectureDialog: (lecture: Lecture) => void;
}) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [dialogState, setDialogState] = React.useState<any>(null);
    const [isSaving, setIsSaving] = React.useState(false);

    const contentsQuery = useMemoFirebase(
        () => (firestore && user) ? query(collection(firestore, `courses/${courseId}/lectures/${lecture.id}/contents`), orderBy('order')) : null,
        [firestore, user, courseId, lecture.id]
    );
    const { data: contents, isLoading: isLoadingContents } = useCollection<LectureContent>(contentsQuery, { ignorePermissionErrors: true });

    const handleSaveContent = async (data: LectureContentFormData) => {
        if (!firestore || !dialogState.lectureId) return;
        setIsSaving(true);
        const lectureId = dialogState.lectureId;
        try {
            if (dialogState.type === 'editContent') {
                const contentDocRef = doc(firestore, `courses/${courseId}/lectures/${lectureId}/contents`, dialogState.content.id);
                await updateDocumentNonBlocking(contentDocRef, data);
                toast({ title: 'تم تحديث المحتوى' });
            } else {
                const newOrder = (contents?.length || 0) + 1;
                await addDocumentNonBlocking(collection(firestore, `courses/${courseId}/lectures/${lectureId}/contents`), { ...data, lectureId, order: newOrder });
                toast({ title: 'تمت إضافة المحتوى' });
            }
            setDialogState(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحفظ' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContent = async () => {
        if (!firestore || dialogState.type !== 'deleteContent') return;
        setIsSaving(true);
        try {
            await deleteDocumentNonBlocking(doc(firestore, `courses/${courseId}/lectures/${dialogState.lectureId}/contents`, dialogState.content.id));
            toast({ title: 'تم حذف المحتوى' });
            setDialogState(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحذف' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <AccordionItem value={lecture.id} key={lecture.id}>
                 <div className="flex items-center justify-between w-full p-4 hover:bg-muted/50 rounded-lg">
                    <AccordionTrigger className="w-full hover:no-underline p-0 flex-grow text-right">
                        <div className="flex items-center gap-4">
                            <LayoutList className="h-6 w-6 text-primary" />
                            <div className="flex-grow">
                                <h4 className="font-bold">{lecture.title}</h4>
                                <p className="text-xs text-muted-foreground">{lecture.description}</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="flex gap-2 pr-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLectureDialog(lecture)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => openDeleteLectureDialog(lecture)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
                <AccordionContent className="p-4 bg-muted/20 border-t">
                    {isLoadingContents ? (
                         <div className="flex h-24 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : contents && contents.length > 0 ? (
                        <div className="space-y-2">
                            {contents.map((content) => (
                                <LectureContentItem
                                  key={content.id}
                                  content={content}
                                  onEdit={() => setDialogState({ type: 'editContent', lectureId: lecture.id, content })}
                                  onDelete={() => setDialogState({ type: 'deleteContent', lectureId: lecture.id, content })}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">
                            لا يوجد محتوى في هذه المحاضرة بعد.
                        </p>
                    )}
                     <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setDialogState({ type: 'addContent', lectureId: lecture.id })}>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة محتوى
                    </Button>
                </AccordionContent>
            </AccordionItem>

            <Dialog open={dialogState?.type === 'addContent' || dialogState?.type === 'editContent'} onOpenChange={(open) => !open && setDialogState(null)}>
                <DialogContent>
                     <LectureContentForm
                        key={dialogState?.content?.id || 'add'}
                        content={dialogState?.content}
                        onSave={handleSaveContent}
                        onClose={() => setDialogState(null)}
                        isSaving={isSaving}
                        allExams={allExams}
                        courseId={courseId}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={dialogState?.type === 'deleteContent'} onOpenChange={(open) => !open && setDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>سيؤدي هذا إلى حذف المحتوى بشكل دابع من قاعدة بيانات المنصة. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDialogState(null)} disabled={isSaving}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteContent} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
                           {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                           حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function CourseContentAccordion({ course }: { course: Course }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [dialogState, setDialogState] = React.useState<any>(null);
    const [isSaving, setIsSaving] = React.useState(false);

    const lecturesQuery = useMemoFirebase(
        () => (firestore && user && course.id) ? query(collection(firestore, `courses/${course.id}/lectures`), orderBy('order')) : null,
        [firestore, user, course.id]
    );
    const { data: lectures, isLoading: isLoadingLectures } = useCollection<Lecture>(lecturesQuery, { ignorePermissionErrors: true });

    const allExamsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'exams') : null, [firestore, user]);
    const { data: allExams, isLoading: isLoadingExams } = useCollection<Exam>(allExamsQuery);

    const gradeExams = React.useMemo(() => {
        if (!allExams || !course) return [];
        return allExams.filter(exam => exam.grade === course.grade);
    }, [allExams, course]);

    const handleSaveLecture = async (data: Omit<Lecture, 'id' | 'courseId' | 'order'>) => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            if (dialogState.type === 'editLecture') {
                const lectureDocRef = doc(firestore, `courses/${course.id}/lectures`, dialogState.lecture.id);
                await updateDocumentNonBlocking(lectureDocRef, data);
                toast({ title: 'تم تحديث المحاضرة' });
            } else {
                const newOrder = (lectures?.length || 0) + 1;
                await addDocumentNonBlocking(collection(firestore, `courses/${course.id}/lectures`), { ...data, courseId: course.id, order: newOrder });
                toast({ title: 'تمت إضافة المحاضرة' });
            }
            setDialogState(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحفظ' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLecture = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await deleteDocumentNonBlocking(doc(firestore, `courses/${course.id}/lectures`, dialogState.lecture.id));
            toast({ title: 'تم حذف المحاضرة' });
            setDialogState(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحذف' });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isLoadingLectures || isLoadingExams;

    return (
        <>
            <Card className="rounded-2xl shadow-lg mt-8">
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>محتوى الكورس</CardTitle>
                    <Button size="sm" onClick={() => setDialogState({ type: 'addLecture' })}>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة محاضرة
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-40 w-full items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : lectures && lectures.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {lectures.map((lecture) => (
                                <LectureAccordionItem
                                    key={lecture.id}
                                    lecture={lecture}
                                    courseId={course.id}
                                    allExams={gradeExams || []}
                                    openEditLectureDialog={(l) => setDialogState({ type: 'editLecture', lecture: l })}
                                    openDeleteLectureDialog={(l) => setDialogState({ type: 'deleteLecture', lecture: l })}
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

            <Dialog open={dialogState?.type === 'addLecture' || dialogState?.type === 'editLecture'} onOpenChange={(open) => !open && setDialogState(null)}>
                <DialogContent>
                    <LectureForm
                        key={dialogState?.lecture?.id || 'add'}
                        lecture={dialogState?.lecture}
                        onSave={handleSaveLecture}
                        onClose={() => setDialogState(null)}
                        isSaving={isSaving}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={dialogState?.type === 'deleteLecture'} onOpenChange={(open) => !open && setDialogState(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>سيؤدي هذا إلى حذف المحاضرة وكل محتوياتها من قاعدة بيانات المنصة بشكل دائم. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDialogState(null)} disabled={isSaving}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteLecture} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
                           {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                           حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = React.use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const courseDocRef = useMemoFirebase(
    () => (firestore && user && courseId ? doc(firestore, 'courses', courseId) : null),
    [firestore, user, courseId]
  );
  const { data: course, isLoading } = useDoc<Course>(courseDocRef);

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{minHeight: '60vh'}}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  if (!course) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Card className="p-8">
                <CardHeader>
                    <CardTitle>لم يتم العثور على الكورس</CardTitle>
                    <CardDescription>قد يكون تم حذفه أو أن الرابط غير صحيح.</CardDescription>
                </CardHeader>
                <CardFooter className="pt-6">
                    <Button onClick={() => router.push('/admin/dashboard/courses')}>الرجوع للكورسات</Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  const hasDiscount = !!course.discountPrice && course.discountPrice > 0;
  const effectivePrice = Math.max(0, course.price - (course.discountPrice || 0));

  return (
    <>
    <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push('/admin/dashboard/courses')}>
            <ArrowLeft className="h-4 w-4" />
            <span>الرجوع للكورسات</span>
        </Button>
      </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        <div className="md:col-span-2">
            <Card className="rounded-2xl shadow-lg flex flex-col justify-center h-full">
                <CardContent className="p-6 flex flex-col items-end justify-center text-right w-full">
                     <div className="w-full text-right space-y-2">
                        <h2 className="text-3xl font-bold mb-2">{course.title}</h2>
                        <div className="w-32 h-0.5 bg-gray-200 dark:bg-gray-700 my-2 ml-auto"></div>
                        <div className="w-24 h-0.5 bg-gray-200 dark:bg-gray-700 mb-4 ml-auto"></div>
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
                     <div className="flex items-baseline justify-center gap-4">
                        {effectivePrice > 0 ? (
                            <div className="inline-flex items-center justify-center bg-primary rounded-md text-primary-foreground font-bold text-lg p-1">
                              <div className="bg-primary-foreground text-primary rounded-sm px-4 py-2">
                                <span>{effectivePrice.toFixed(0)}</span>
                              </div>
                              <span className="px-4">جنيهاً</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-bold text-lg p-3">
                                <span>كورس مجاني!</span>
                            </div>
                        )}
                         {hasDiscount && (
                            <span className="text-sm font-medium text-muted-foreground/60 diagonal-strike whitespace-nowrap">{course.price.toFixed(0)} ج</span>
                        )}
                    </div>
                    <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={() => setIsEditDialogOpen(true)}>
                        <Pencil className="ml-2 h-4 w-4" />
                        تعديل الكورس
                    </Button>
                </div>
            </Card>
        </div>
    </div>
    <CourseContentAccordion course={course} />
    {course && (
        <EditCourseDialog
            course={course}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
        />
    )}
    </>
  );
}
