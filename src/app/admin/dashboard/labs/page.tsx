
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PlusCircle,
  Pencil,
  Trash2,
  FlaskConical,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { LabExperiment } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';

const gradeMap: Record<string, string> = {
  all: 'كل الصفوف',
  first_secondary: 'الصف الأول الثانوي',
  second_secondary: 'الصف الثاني الثانوي',
  third_secondary: 'الصف الثالث الثانوي',
};

export default function AdminLabsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingLab, setEditingLab] = React.useState<LabExperiment | null>(null);
  const [deleteLabId, setDeleteLabId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    embedUrl: '',
    grade: 'all' as LabExperiment['grade'],
  });

  const labsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'labs'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: labs, isLoading } = useCollection<LabExperiment>(labsQuery);

  const handleOpenAdd = () => {
    setEditingLab(null);
    setFormData({ title: '', description: '', embedUrl: '', grade: 'all' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (lab: LabExperiment) => {
    setEditingLab(lab);
    setFormData({
      title: lab.title,
      description: lab.description,
      embedUrl: lab.embedUrl,
      grade: lab.grade,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);

    try {
      if (editingLab) {
        await updateDocumentNonBlocking(doc(firestore, 'labs', editingLab.id), formData);
        toast({ title: 'تم تحديث التجربة بنجاح' });
      } else {
        await addDocumentNonBlocking(collection(firestore, 'labs'), {
          ...formData,
          createdAt: new Date().toISOString(),
        });
        toast({ title: 'تمت إضافة التجربة بنجاح' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل الحفظ' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deleteLabId) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, 'labs', deleteLabId));
      toast({ title: 'تم حذف التجربة' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل الحذف' });
    } finally {
      setDeleteLabId(null);
    }
  };

  const filteredLabs = labs?.filter((lab) =>
    lab.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <LoadingAnimation size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            إدارة المعمل الافتراضي
          </h1>
          <p className="text-muted-foreground text-sm">أضف تجارب تفاعلية من PhET لطلابك.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          إضافة تجربة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن تجربة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم التجربة</TableHead>
                  <TableHead>الصف الدراسي</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      لا توجد تجارب مضافة بعد.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLabs?.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.title}</TableCell>
                      <TableCell>{gradeMap[lab.grade]}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(lab)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleteLabId(lab.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingLab ? 'تعديل التجربة' : 'إضافة تجربة جديدة'}</DialogTitle>
              <DialogDescription>
                أدخل بيانات التجربة ورابط التضمين من موقع PhET.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>عنوان التجربة</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رابط التضمين (Embed URL)</Label>
                <Input
                  value={formData.embedUrl}
                  onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                  placeholder="https://phet.colorado.edu/sims/html/..."
                  required
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground">
                  استخدم الرابط الموجود داخل كود الـ iframe في موقع PhET.
                </p>
              </div>
              <div className="space-y-2">
                <Label>الصف الدراسي المستهدف</Label>
                <Select
                  dir="rtl"
                  value={formData.grade}
                  onValueChange={(v) => setFormData({ ...formData, grade: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الصفوف</SelectItem>
                    <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حفظ التجربة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLabId} onOpenChange={(open) => !open && setDeleteLabId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم حذف هذه التجربة من قائمة المعمل نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
