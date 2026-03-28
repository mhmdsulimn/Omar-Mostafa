'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import type { Question, Exam, AppSettings, Curriculum } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Star, CheckCircle, Pencil, Trash2, Loader2, Link as LinkIcon, Sparkles, Wand2, RefreshCcw, Save } from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, increment, deleteField, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload, uploadToImgBB } from '@/components/common/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { generateAIQuestions } from '@/ai/flows/generate-questions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type QuestionFormData = Omit<Question, 'id' | 'examId'>;

function AIGenerationDialog({ exam, onQuestionsAdded }: { exam: Exam, onQuestionsAdded: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [generatedQuestions, setGeneratedQuestions] = React.useState<any[] | null>(null);
    
    const [config, setConfig] = React.useState({
        topic: '',
        count: 5,
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        points: 1,
    });

    const curriculumRef = useMemoFirebase(() => (firestore ? doc(firestore, 'curriculum', exam.grade) : null), [firestore, exam.grade]);
    const { data: curriculum } = useDoc<Curriculum>(curriculumRef, { ignorePermissionErrors: true });

    const handleGenerate = async () => {
        if (!config.topic) {
            toast({ variant: 'destructive', title: 'يرجى إدخال الموضوع', description: 'حدد الوحدة أو القاعدة المطلوبة.' });
            return;
        }
        setIsGenerating(true);
        setGeneratedQuestions(null);
        try {
            const targetUnit = curriculum?.units.find(u => 
                u.title.toLowerCase().includes(config.topic.toLowerCase()) || 
                String(u.id) === config.topic
            );

            const result = await generateAIQuestions({
                grade: exam.grade,
                topic: config.topic,
                count: config.count,
                difficulty: config.difficulty,
                curriculumContext: curriculum ? {
                    story: curriculum.story,
                    targetUnit: targetUnit || 'General English Practice'
                } : undefined
            });
            
            const resultsWithUserPoints = result.map(q => ({ ...q, points: config.points }));
            setGeneratedQuestions(resultsWithUserPoints);
            toast({ title: 'تم التوليد بنجاح' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'فشل التوليد الذكي' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAll = async () => {
        if (!generatedQuestions || !firestore) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const questionsCol = collection(firestore, 'exams', exam.id, 'questions');
            const examDocRef = doc(firestore, 'exams', exam.id);

            generatedQuestions.forEach(q => {
                const newDocRef = doc(questionsCol);
                batch.set(newDocRef, { ...q, examId: exam.id });
            });

            batch.update(examDocRef, { questionCount: increment(generatedQuestions.length) });
            await batch.commit();

            toast({ title: 'تم الحفظ بنجاح' });
            setIsOpen(false);
            onQuestionsAdded();
        } catch (e) {
            toast({ variant: 'destructive', title: 'فشل الحفظ الجماعي' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setGeneratedQuestions(null); }}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-9 sm:h-8 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-none shadow-md rounded-xl">
                    <Sparkles className="h-4 w-4" />
                    <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">توليد أسئلة ذكية</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Wand2 className="h-6 w-6 text-primary" />
                        توليد أسئلة ذكية
                    </DialogTitle>
                    <DialogDescription>سيقوم المساعد بالبحث عن أحدث الأسئلة وتوليدها لك فوراً.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!generatedQuestions ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>الموضوع / رقم الوحدة</Label>
                                <Input 
                                    value={config.topic}
                                    onChange={e => setConfig({...config, topic: e.target.value})}
                                    className="rounded-xl h-12"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>عدد الأسئلة</Label>
                                    <Select value={String(config.count)} onValueChange={v => setConfig({...config, count: Number(v)})}>
                                        <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[1, 3, 5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n} أسئلة</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>الصعوبة</Label>
                                    <Select value={config.difficulty} onValueChange={v => setConfig({...config, difficulty: v as any})}>
                                        <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">سهل</SelectItem>
                                            <SelectItem value="medium">متوسط</SelectItem>
                                            <SelectItem value="hard">متفوقين</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>الدرجة</Label>
                                    <Input 
                                        type="number"
                                        value={config.points}
                                        onChange={e => setConfig({...config, points: Math.max(1, Number(e.target.value))})}
                                        className="rounded-xl h-12"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-14 text-lg font-bold rounded-2xl gap-2 mt-4">
                                {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                                {isGenerating ? 'جارِ التوليد...' : 'ابدأ التوليد'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between sticky top-0 bg-background/95 z-10 py-2 border-b">
                                <p className="font-bold text-primary">تم توليد {generatedQuestions.length} سؤال</p>
                                <Button variant="ghost" size="sm" onClick={() => setGeneratedQuestions(null)} className="h-8 gap-1"><RefreshCcw className="h-3 w-3" /> إعادة</Button>
                            </div>
                            {generatedQuestions.map((q, idx) => (
                                <Card key={idx} className="border-primary/10">
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-sm font-bold leading-relaxed" dir="ltr">{q.text}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 text-xs space-y-1">
                                        {['option1', 'option2', 'option3', 'option4'].map(opt => (
                                            <div key={opt} className={cn("p-2 rounded-lg border", q.correctAnswer === opt ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-muted/30 border-transparent")}>
                                                {q[opt as keyof typeof q]}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {generatedQuestions && (
                    <DialogFooter className="p-6 bg-muted/30 border-t">
                        <Button onClick={handleSaveAll} disabled={isSaving} className="gap-2 px-8">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            حفظ الأسئلة
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

function QuestionForm({
  question,
  onSave,
  onCancel,
}: {
  question?: Question | null;
  onSave: (data: QuestionFormData, file: File | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = React.useState<QuestionFormData>({
    text: question?.text || '',
    option1: question?.option1 || '',
    option2: question?.option2 || '',
    option3: question?.option3 || '',
    option4: question?.option4 || '',
    correctAnswer: question?.correctAnswer || 'option1',
    points: question?.points || 1,
    imageUrl: question?.imageUrl || '',
  });
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData, pendingFile);
    setIsSaving(false);
  };

  return (
    <Card className="rounded-2xl shadow-xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{question ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>نص السؤال</Label>
            <Textarea id="text" value={formData.text} onChange={handleChange} required disabled={isSaving} className="rounded-xl min-h-[100px]" autoComplete="off" />
          </div>

          <div className="space-y-4 border-t pt-4">
              <Label className="font-bold opacity-80">صورة السؤال (اختياري)</Label>
              <ImageUpload 
                  onImageSelect={setPendingFile}
                  defaultValue={formData.imageUrl}
              />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="font-bold opacity-80">الاختيارات</Label>
            <RadioGroup value={formData.correctAnswer} onValueChange={v => setFormData(p => ({...p, correctAnswer: v}))} className="grid gap-2" dir="rtl">
              {(['option1', 'option2', 'option3', 'option4'] as const).map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`r-${opt}`} />
                  <Input id={opt} value={formData[opt]} onChange={handleChange} placeholder={`الاختيار ${opt.slice(-1)}`} required disabled={isSaving} className="rounded-xl" autoComplete="off" />
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="font-bold opacity-80">الدرجة</Label>
            <Input id="points" type="number" value={formData.points} onChange={e => setFormData(p => ({ ...p, points: Math.max(1, Number(e.target.value)) }))} required disabled={isSaving} min="1" className="rounded-xl w-32" autoComplete="off" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 bg-muted/20 p-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="rounded-xl">إلغاء</Button>
            <Button type="submit" disabled={isSaving || !formData.text} className="rounded-xl min-w-[120px]">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (question ? 'تحديث' : 'إنشاء')}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ManageQuestionsPage() {
  const params = useParams();
  const examId = params.id as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [viewState, setViewState] = React.useState<{mode: 'list' | 'add' | 'edit', question?: Question}>({ mode: 'list' });
  const [questionToDelete, setQuestionToDelete] = React.useState<Question | null>(null);

  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

  const examDocRef = useMemoFirebase(() => (firestore && examId ? doc(firestore, 'exams', examId) : null), [firestore, examId]);
  const { data: exam, isLoading: isLoadingExam } = useDoc<Exam>(examDocRef);

  const questionsCollectionRef = useMemoFirebase(() => (firestore && examId ? collection(firestore, 'exams', examId, 'questions') : null), [firestore, examId]);
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsCollectionRef, { ignorePermissionErrors: true });

  const totalPoints = React.useMemo(() => questions?.reduce((acc, q) => acc + (q.points || 0), 0) || 0, [questions]);

  const handleSaveQuestion = async (questionData: QuestionFormData, file: File | null) => {
    if (!firestore || !examId) return;
    try {
      let finalImageUrl = questionData.imageUrl;
      if (file) {
        finalImageUrl = await uploadToImgBB(file, appSettings?.imgbbApiKey);
      }

      const updatedData: any = { 
          text: questionData.text,
          option1: questionData.option1,
          option2: questionData.option2,
          option3: questionData.option3,
          option4: questionData.option4,
          correctAnswer: questionData.correctAnswer,
          points: Number(questionData.points)
      };

      if (finalImageUrl) {
          updatedData.imageUrl = finalImageUrl;
      } else if (viewState.mode === 'edit' && !questionData.imageUrl) {
          updatedData.imageUrl = deleteField();
      }

      if (viewState.mode === 'edit' && viewState.question) {
        await updateDocumentNonBlocking(doc(firestore, 'exams', examId, 'questions', viewState.question.id), updatedData);
        toast({ title: 'تم التحديث' });
      } else {
        await addDocumentNonBlocking(collection(firestore, 'exams', examId, 'questions'), { ...updatedData, examId });
        await updateDocumentNonBlocking(examDocRef!, { questionCount: increment(1) });
        toast({ title: 'تم الإنشـاء' });
      }
      setViewState({ mode: 'list' });
    } catch (error) {
      toast({ title: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!firestore || !examId || !questionToDelete) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, 'exams', examId, 'questions', questionToDelete.id));
      await updateDocumentNonBlocking(examDocRef!, { questionCount: increment(-1) });
      toast({ title: 'تم الحذف' });
    } catch (error) {
      toast({ title: 'حدث خطأ', variant: 'destructive' });
    } finally { setQuestionToDelete(null); }
  };

  if (isLoadingExam || isLoadingQuestions) return <div className="flex h-screen items-center justify-center"><LoadingAnimation size="md" /></div>;
  if (!exam) return <div className="text-center py-20 font-bold">غير موجود.</div>;

  if (viewState.mode === 'add' || viewState.mode === 'edit') {
    return (
       <div className="max-w-4xl mx-auto px-2 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => setViewState({ mode: 'list' })} className="rounded-xl shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className='flex-grow min-w-0 text-right'>
             <h1 className="text-lg font-semibold md:text-2xl line-clamp-1">{viewState.mode === 'add' ? 'إضافة سؤال' : 'تعديل السؤال'}</h1>
             <p className="text-xs md:text-sm text-muted-foreground truncate">{exam.title}</p>
          </div>
        </div>
        <QuestionForm question={viewState.question} onSave={handleSaveQuestion} onCancel={() => setViewState({ mode: 'list' })} />
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto px-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button asChild variant="outline" size="icon" className="rounded-xl shrink-0"><Link href="/admin/dashboard/exams"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className='min-w-0 text-right flex-1'>
            <h1 className="text-xl md:text-2xl font-bold break-words leading-tight">{exam?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs md:text-sm text-muted-foreground font-medium">إدارة الأسئلة</p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black px-2 py-0.5 text-[10px] md:text-xs" dir="ltr">
                {totalPoints} درجة
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <AIGenerationDialog exam={exam} onQuestionsAdded={() => {}} />
          <Button size="sm" className="h-9 sm:h-8 gap-1 rounded-xl" onClick={() => setViewState({ mode: 'add' })}>
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">إضافة سؤال</span>
          </Button>
        </div>
      </div>
      
      {(!questions || questions.length === 0) ? (
         <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 px-4">
            <h3 className="text-xl font-bold">لا توجد أسئلة بعد</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                <Button variant="outline" className="rounded-2xl px-6 h-12" onClick={() => setViewState({ mode: 'add' })}><PlusCircle className="ml-2 h-5 w-5" /> إضافة يدوية</Button>
                <AIGenerationDialog exam={exam} onQuestionsAdded={() => {}} />
            </div>
          </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {questions?.map((question) => (
            <Card key={question.id} className="flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border bg-card/50 group">
                <CardHeader className="bg-muted/10 pb-4">
                    <CardTitle className="line-clamp-2 text-base text-start font-bold leading-relaxed" dir="auto">{question.text}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 pt-4 px-4 sm:px-6 text-start">
                    {question.imageUrl && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 bg-black/5 border"><Image src={question.imageUrl} alt="Question" fill className="object-contain" /></div>
                    )}
                    <div className="flex items-center text-sm font-medium text-green-600">
                        <CheckCircle className="ml-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{question[question.correctAnswer as keyof Question]}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground font-bold"><Star className="ml-2 h-3.5 w-3.5 text-amber-400 shrink-0" /><span>{question.points} درجة</span></div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 bg-muted/30 p-3 sm:p-4 border-t">
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setQuestionToDelete(question)}><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewState({ mode: 'edit', question })}><Pencil className="h-4 w-4" /></Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
      <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader><AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle><AlertDialogDescription className="text-right">سيؤدي هذا إلى حذف السؤال نهائياً.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start"><AlertDialogCancel className="rounded-2xl">إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground rounded-2xl">حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
