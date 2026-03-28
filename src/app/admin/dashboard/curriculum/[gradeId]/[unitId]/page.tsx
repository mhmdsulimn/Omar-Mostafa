'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Save, 
  ArrowRight,
  Type, 
  FileText, 
  BrainCircuit, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import type { Curriculum, CurriculumUnit } from '@/lib/data';
import { ENGLISH_CURRICULUM } from '@/lib/curriculum-data';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/ui/loading-animation';

const gradeLabels: Record<string, string> = {
  first_secondary: 'الصف الأول الثانوي',
  second_secondary: 'الصف الثاني الثانوي',
  third_secondary: 'الصف الثالث الثانوي',
};

export default function UnitEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { gradeId, unitId } = params;
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = React.useState(false);
  const [unitData, setUnitData] = React.useState<CurriculumUnit | null>(null);

  const curriculumRef = useMemoFirebase(
    () => (firestore && gradeId ? doc(firestore, 'curriculum', gradeId as string) : null),
    [firestore, gradeId]
  );
  
  const { data: curriculum, isLoading } = useDoc<Curriculum>(curriculumRef, { ignorePermissionErrors: true });

  React.useEffect(() => {
    if (curriculum) {
      const unit = curriculum.units.find(u => u.id === Number(unitId));
      if (unit) {
        setUnitData(unit);
      }
    } else if (!isLoading && gradeId) {
      // Fallback to default if doc doesn't exist in Firestore yet
      const defaultGrade = (ENGLISH_CURRICULUM as any)[gradeId as string];
      const defaultUnit = defaultGrade?.units.find((u: any) => u.id === Number(unitId));
      if (defaultUnit) {
        setUnitData(defaultUnit);
      } else {
        setUnitData({ id: Number(unitId), title: '', grammar: '', writing: '' });
      }
    }
  }, [curriculum, isLoading, unitId, gradeId]);

  const handleSave = async () => {
    if (!firestore || !unitData || !gradeId) return;
    setIsSaving(true);

    try {
      let updatedCurriculum: Partial<Curriculum>;

      if (curriculum) {
        const newUnits = [...curriculum.units];
        const index = newUnits.findIndex(u => u.id === Number(unitId));
        if (index !== -1) {
          newUnits[index] = unitData;
        } else {
          newUnits.push(unitData);
        }
        updatedCurriculum = { ...curriculum, units: newUnits, lastUpdated: new Date().toISOString() };
      } else {
        // Handle case where document doesn't exist yet
        const defaultGrade = (ENGLISH_CURRICULUM as any)[gradeId as string];
        const units = defaultGrade ? [...defaultGrade.units] : Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: '', grammar: '', writing: '' }));
        const index = units.findIndex(u => u.id === Number(unitId));
        units[index] = unitData;

        updatedCurriculum = {
          id: gradeId as string,
          gradeTitle: gradeLabels[gradeId as string] || '',
          story: defaultGrade?.story || '',
          units: units,
          lastUpdated: new Date().toISOString(),
        };
      }

      await setDocumentNonBlocking(doc(firestore, 'curriculum', gradeId as string), updatedCurriculum, { merge: true });
      toast({ title: 'تم حفظ بيانات الوحدة', description: `تم تحديث Unit ${unitId} بنجاح.` });
      router.back();
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل الحفظ', description: 'يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !unitData) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <LoadingAnimation size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">تعديل بيانات Unit {unitId}</h1>
            <p className="text-muted-foreground text-sm font-bold mt-1">
              {gradeLabels[gradeId as string]}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-xl px-4">
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-primary/10 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl">
        <CardHeader className="border-b border-white/5 pb-8 pt-8">
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="h-8 px-6 text-sm font-black bg-primary/10 text-primary border-primary/20 rounded-full uppercase tracking-tighter">
              Unit Configuration
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 py-10 px-6 md:px-12">
          {/* Unit Title */}
          <div className="space-y-3">
            <Label className="text-sm font-black flex items-center gap-2 text-primary pr-1">
              <Type className="h-4 w-4" />
              عنوان الوحدة / موضوع الكلمات (Topic)
            </Label>
            <Input
              placeholder="مثال: Getting Away"
              value={unitData.title}
              onChange={(e) => setUnitData({ ...unitData, title: e.target.value })}
              className="text-right font-black bg-background border-primary/10 h-16 rounded-2xl focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all text-xl shadow-inner"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground text-right px-2">هذا هو الموضوع الأساسي الذي سيبني عليه المساعد الذكي قاموس الكلمات.</p>
          </div>

          {/* Grammar */}
          <div className="space-y-3">
            <Label className="text-sm font-black flex items-center gap-2 text-primary pr-1">
              <BrainCircuit className="h-4 w-4" />
              قواعد الجرامر المقررة (Grammar)
            </Label>
            <Textarea
              placeholder="اكتب القواعد هنا... (مثال: Past Simple vs Past Continuous)"
              value={unitData.grammar}
              onChange={(e) => setUnitData({ ...unitData, grammar: e.target.value })}
              className="min-h-[150px] text-right text-lg font-bold leading-relaxed bg-background border-primary/10 rounded-2xl focus-visible:ring-primary/20 shadow-inner"
              dir="ltr"
            />
          </div>

          {/* Writing Skills */}
          <div className="space-y-3">
            <Label className="text-sm font-black flex items-center gap-2 text-primary pr-1">
              <FileText className="h-4 w-4" />
              مهارات الكتابة (Writing Skills)
            </Label>
            <Textarea
              placeholder="مثال: Writing a Narrative Essay / Email structure"
              value={unitData.writing}
              onChange={(e) => setUnitData({ ...unitData, writing: e.target.value })}
              className="min-h-[150px] text-right text-lg font-bold leading-relaxed bg-background border-primary/10 rounded-2xl focus-visible:ring-primary/20 shadow-inner"
              dir="ltr"
            />
          </div>
        </CardContent>

        <CardFooter className="bg-primary/5 p-8 border-t border-primary/10">
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="w-full h-16 text-xl font-black rounded-3xl shadow-[0_15px_30px_-10px_rgba(var(--primary),0.4)] hover:shadow-[0_20px_40px_-10px_rgba(var(--primary),0.5)] transition-all hover:scale-[1.01] active:scale-95 gap-3"
          >
            {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
            حفظ واعتماد بيانات Unit {unitId}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
