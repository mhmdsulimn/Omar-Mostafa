'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  GraduationCap, 
  Sparkles, 
  BrainCircuit, 
  LayoutDashboard,
  Info,
  Settings2,
  ChevronLeft,
  Type,
  FileText,
  CheckCircle2,
  Save,
  History
} from 'lucide-react';
import type { Curriculum, CurriculumUnit } from '@/lib/data';
import { ENGLISH_CURRICULUM } from '@/lib/curriculum-data';
import { cn, toArabicDigits } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';

const gradeConfigs = [
  { id: 'first_secondary', label: 'الأول الثانوي' },
  { id: 'second_secondary', label: 'الثاني الثانوي' },
  { id: 'third_secondary', label: 'الثالث الثانوي' },
];

function UnitEditorDialog({ 
  unit, 
  isOpen, 
  onClose, 
  onSave, 
  isSaving 
}: { 
  unit: CurriculumUnit | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (unitData: CurriculumUnit) => Promise<void>;
  isSaving: boolean;
}) {
  const [formData, setFormData] = React.useState<CurriculumUnit | null>(null);

  React.useEffect(() => {
    if (unit && isOpen) {
      setFormData({ ...unit });
    }
  }, [unit, isOpen]);

  if (!formData) return null;

  const hasChanges = unit ? (
    formData.title !== unit.title ||
    formData.grammar !== unit.grammar ||
    formData.writing !== unit.writing
  ) : false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
        <div className="p-8 space-y-6">
          <DialogHeader className="text-right">
            <div className="flex items-center justify-between flex-row-reverse mb-2">
              <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1 rounded-full">Unit {formData.id}</Badge>
              <DialogTitle className="text-2xl font-black">تعديل بيانات الوحدة</DialogTitle>
            </div>
            <DialogDescription className="text-right font-bold text-muted-foreground">تعديلاتك هنا ستعتبر "دستوراً" يلتزم به مساعد تسلا فوراً وتلغي أي معلومات سابقة لديه.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-black text-primary flex items-center gap-2 justify-end">
                عنوان الوحدة / الموضوع (Topic) <Type className="h-3 w-3" />
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-background border-primary/10 h-12 text-right font-bold rounded-xl"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-primary flex items-center gap-2 justify-end">
                مواضيع الفيزياء (Topics) <BrainCircuit className="h-3 w-3" />
              </Label>
              <Textarea
                value={formData.grammar}
                onChange={(e) => setFormData({ ...formData, grammar: e.target.value })}
                className="bg-background border-primary/10 min-h-[100px] text-right font-medium rounded-xl leading-relaxed"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-primary flex items-center gap-2 justify-end">
                القوانين والتطبيقات <FileText className="h-3 w-3" />
              </Label>
              <Textarea
                value={formData.writing}
                onChange={(e) => setFormData({ ...formData, writing: e.target.value })}
                className="bg-background border-primary/10 min-h-[100px] text-right font-medium rounded-xl leading-relaxed"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-6 border-t border-primary/10 flex gap-3">
          <Button 
            onClick={() => onSave(formData)} 
            disabled={isSaving || !hasChanges || !formData.title.trim()}
            className="flex-1 h-12 font-black rounded-2xl shadow-lg gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            حفظ التعديلات واعتمادها
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="h-12 px-6 rounded-2xl">إلغاء</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GradeCurriculumEditor({ gradeId }: { gradeId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<CurriculumUnit | null>(null);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);

  const curriculumRef = useMemoFirebase(() => (firestore ? doc(firestore, 'curriculum', gradeId) : null), [firestore, gradeId]);
  const { data: curriculum, isLoading } = useDoc<Curriculum>(curriculumRef, { ignorePermissionErrors: true });

  const [formData, setFormData] = React.useState<Curriculum | null>(null);

  React.useEffect(() => {
    if (curriculum) {
      setFormData(curriculum);
    } else if (!isLoading) {
      const defaultData = (ENGLISH_CURRICULUM as any)[gradeId];
      if (defaultData) {
          setFormData({
            id: gradeId,
            gradeTitle: defaultData.title,
            story: defaultData.story,
            units: defaultData.units,
            lastUpdated: new Date().toISOString(),
          });
      }
    }
  }, [curriculum, isLoading, gradeId]);

  const handleSaveToFirestore = async (updatedData: Partial<Curriculum>, successMessage: string) => {
    if (!firestore || !user || !formData) return;
    setIsUpdating(true);
    const docRef = doc(firestore, 'curriculum', gradeId);

    try {
      const finalPayload: Curriculum = {
        ...formData,
        ...updatedData,
        id: gradeId,
        lastUpdated: new Date().toISOString(),
      };

      await setDoc(docRef, finalPayload); 
      
      toast({ title: 'تم الحفظ والمزامنة', description: successMessage });
      setIsUnitDialogOpen(false);
    } catch (error: any) {
      console.error("Curriculum Save error:", error);
      toast({ variant: 'destructive', title: 'فشل التحديث، جرب مرة أخرى.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const onUnitSave = async (unitData: CurriculumUnit) => {
    if (!formData) return;
    const newUnits = [...formData.units];
    const index = newUnits.findIndex(u => u.id === unitData.id);
    if (index !== -1) {
      newUnits[index] = unitData;
      await handleSaveToFirestore({ units: newUnits }, `تم تحديث Unit ${unitData.id} ومزامنته فوراً مع مساعد تسلا.`);
    }
  };

  if (isLoading && !formData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" /></div>;
  }

  if (!formData) return null;

  const initialStory = curriculum?.story || (ENGLISH_CURRICULUM as any)[gradeId]?.story || '';
  const storyChanged = formData.story.trim() !== initialStory;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <UnitEditorDialog 
        unit={editingUnit} 
        isOpen={isUnitDialogOpen} 
        onClose={() => setIsUnitDialogOpen(false)} 
        onSave={onUnitSave}
        isSaving={isUpdating}
      />

      <div className="flex items-center justify-between px-4 bg-muted/20 p-4 rounded-2xl border border-dashed border-primary/10">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-muted-foreground" />
          <div className="text-right">
            <p className="text-[10px] font-black opacity-50 uppercase">حالة المزامنة مع تسلا</p>
            <p className="text-xs font-bold text-primary">
              {formData.lastUpdated ? toArabicDigits(format(new Date(formData.lastUpdated), 'pp - d MMMM yyyy', { locale: arSA })) : 'جاهز للمزامنة'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 px-3">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          مزامنة لحظية
        </Badge>
      </div>

      <Card className="rounded-[2.5rem] border-primary/10 bg-primary/5 shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/10 border-b border-primary/10 pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              المصدر الأكاديمي (Reference)
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => handleSaveToFirestore({ story: formData.story }, 'تم تحديث المصدر واعتماده كمرجع وحيد لتسلا.')} 
              disabled={isUpdating || !storyChanged || !formData.story.trim()}
              className="rounded-full px-6 shadow-lg"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ المرجع
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="w-full lg:w-1/3 space-y-3">
              <Label className="text-xs font-black opacity-50 block text-right">اسم المرجع أو الكتاب</Label>
              <Input
                value={formData.story}
                onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                className="bg-background border-primary/10 h-16 text-center text-xl rounded-2xl font-black shadow-inner"
                dir="ltr"
              />
            </div>
            <div className="flex-1 flex items-start gap-5 p-6 bg-background/40 rounded-[2rem] border border-dashed border-primary/20">
              <div className="p-3 bg-primary/10 rounded-2xl shrink-0"><Info className="h-6 w-6 text-primary" /></div>
              <div className="space-y-1 text-right">
                <h4 className="font-black text-primary text-sm">أولوية الدستور</h4>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">أي تغيير تقوم به هنا سيقوم "تسلا" باعتماده فوراً ونسيان أي معلومات سابقة لديه عن هذا الصف.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {formData.units.map((unit) => {
          const isFilled = !!(unit.title || unit.grammar || unit.writing);
          return (
            <div 
              key={`${gradeId}-unit-${unit.id}`}
              onClick={() => { setEditingUnit(unit); setIsUnitDialogOpen(true); }}
              className={cn(
                "group relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer text-right overflow-hidden flex flex-col justify-between h-[200px]",
                "hover:shadow-xl hover:-translate-y-2 active:scale-95",
                isFilled ? "bg-card border-primary/10 shadow-lg" : "bg-muted/10 border-dashed opacity-70"
              )}
            >
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center font-black text-lg", isFilled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {unit.id}
                </div>
                {isFilled && <Badge className="bg-primary/5 text-primary text-[10px] border-none">معدلة</Badge>}
              </div>
              <h3 className={cn("font-black text-xl leading-tight group-hover:text-primary transition-colors line-clamp-2", !unit.title && "italic text-muted-foreground/50 text-sm")}>
                {unit.title || "اضغط لإضافة عنوان"}
              </h3>
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-all mt-4">
                <ChevronLeft className="h-3 w-3" /> <span>تعديل الدستور</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminCurriculumPage() {
  const [activeGrade, setActiveGrade] = React.useState('first_secondary');

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6">
      <div className="flex items-center gap-6 px-4 md:px-0">
        <div className="bg-primary/10 p-5 rounded-[2rem] border-2 border-primary/20 shadow-2xl animate-premium-icon">
          <GraduationCap className="h-12 w-12 text-primary" />
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-black md:text-6xl tracking-tight">دستور الفيزياء</h1>
          <p className="text-sm md:text-lg text-muted-foreground font-bold mt-2">المصدر الحصري والنهائي لإجابات مساعد تسلا الذكي.</p>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <div className="grid grid-cols-3 p-2 bg-muted/30 backdrop-blur-2xl rounded-[2.5rem] mb-12 border border-white/5 shadow-2xl">
          {gradeConfigs.map((grade) => (
            <button 
              key={grade.id} 
              onClick={() => setActiveGrade(grade.id)}
              className={cn(
                "py-5 text-sm md:text-2xl font-black rounded-[2rem] transition-all duration-500 flex items-center justify-center gap-3",
                activeGrade === grade.id ? "bg-background text-primary shadow-xl scale-[1.02]" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <Settings2 className={cn("h-5 w-5 md:h-7 md:w-7 transition-transform", activeGrade === grade.id && "rotate-180")} />
              <span className="hidden sm:inline">{grade.label}</span>
              <span className="sm:hidden">{grade.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-1">
        <GradeCurriculumEditor key={activeGrade} gradeId={activeGrade} />
      </div>
    </div>
  );
}
