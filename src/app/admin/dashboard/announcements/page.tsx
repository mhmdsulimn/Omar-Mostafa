'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, User, Megaphone, CheckCircle2, Bell, Sparkles, AlertTriangle } from 'lucide-react';
import type { Announcement, Student } from '@/lib/data';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/ui/loading-animation';

const gradeMap: Record<string, string> = {
  all: 'الكل',
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
};

const categoryMap: Record<string, { label: string, color: string, icon: any }> = {
    normal: { label: 'عادية', color: 'text-foreground', icon: Bell },
    congratulation: { label: 'تهنئة', color: 'text-green-600', icon: Sparkles },
    warning: { label: 'تحذير', color: 'text-destructive', icon: AlertTriangle },
};

function AnnouncementForm({
  onSave,
  onClose,
}: {
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
    const firestore = useFirestore();
    const [formData, setFormData] = React.useState({
        message: '',
        isActive: true,
        targetGrade: 'all',
        targetType: 'global',
        category: 'normal',
    });
    const [isSaving, setIsSaving] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<Student[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
    const [adminIds, setAdminIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        const fetchAdmins = async () => {
            if (!firestore) return;
            try {
                const adminsSnap = await getDocs(collection(firestore, 'roles_admin'));
                const ids = new Set(adminsSnap.docs.map(d => d.id));
                setAdminIds(ids);
            } catch (e) {}
        };
        fetchAdmins();
    }, [firestore]);

    const handleSearchStudents = async () => {
        if (!searchTerm.trim() || !firestore) return;
        setIsSearching(true);
        try {
            const snap = await getDocs(collection(firestore, 'users'));
            const term = searchTerm.toLowerCase().trim();
            const results = snap.docs
                .map(d => ({ ...d.data() as Student, id: d.id }))
                .filter(s => {
                    if (adminIds.has(s.id)) return false;
                    // تحسين البحث عن الطالب بالاسم الكامل (دمج الاسم الأول والأخير)
                    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
                    const email = (s.email || '').toLowerCase();
                    return fullName.includes(term) || email.includes(term);
                });
            setSearchResults(results.slice(0, 10));
        } catch (e) {
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.targetType === 'student' && !selectedStudent) return;
        setIsSaving(true);
        await onSave({
            ...formData,
            studentId: selectedStudent?.id,
            studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : undefined
        });
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle className="text-right">إرسال رسالة جديدة</DialogTitle>
                <DialogDescription className="text-right">اختر نوع الرسالة والمستهدفين.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label className="text-right block w-full">نوع الرسالة</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={formData.targetType === 'global' ? 'default' : 'outline'} onClick={() => setFormData(prev => ({...prev, targetType: 'global'}))}>إعلان عام</Button>
                        <Button type="button" variant={formData.targetType === 'student' ? 'default' : 'outline'} onClick={() => setFormData(prev => ({...prev, targetType: 'student'}))}>رسالة خاصة</Button>
                    </div>
                </div>
                {formData.targetType === 'global' ? (
                    <div className="space-y-2 text-right">
                        <Label>توجيه الإعلان إلى</Label>
                        <Select dir="rtl" value={formData.targetGrade} onValueChange={(v) => setFormData(prev => ({...prev, targetGrade: v as any}))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                               <SelectItem value="all">كل الصفوف</SelectItem>
                               <SelectItem value="first_secondary">1ث</SelectItem>
                               <SelectItem value="second_secondary">2ث</SelectItem>
                               <SelectItem value="third_secondary">3ث</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="space-y-2 text-right">
                        <Label>ابحث عن الطالب بالاسم بالكامل</Label>
                        <div className="flex gap-2">
                            <Button type="button" size="icon" onClick={handleSearchStudents} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                            <Input placeholder="اكتب اسم الطالب بالكامل هنا..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchStudents())} className="text-right" />
                        </div>
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="mt-2 rounded-lg border bg-muted/50 p-1 space-y-1">
                                {searchResults.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-background rounded cursor-pointer" onClick={() => { setSelectedStudent(s); setSearchResults([]); setSearchTerm(''); }}>
                                        <Badge variant="outline" className="text-[10px]">{gradeMap[s.grade]}</Badge>
                                        <div className="flex items-center gap-2"><span className="text-xs font-bold">{s.firstName} {s.lastName}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedStudent && (
                            <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-7 text-destructive">تغيير</Button>
                                <span className="text-sm font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="space-y-2 text-right">
                    <Label htmlFor="message">نص الرسالة</Label>
                    <Textarea id="message" value={formData.message} onChange={e => setFormData(prev => ({...prev, message: e.target.value}))} required disabled={isSaving} className="min-h-[100px] text-right" placeholder="اكتب محتوى الرسالة هنا..." />
                </div>
            </div>
             <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={isSaving || !formData.message || (formData.targetType === 'student' && !selectedStudent)}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إرسال
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>إلغاء</Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminAnnouncementsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [deleteDialogId, setDeleteDialogId] = React.useState<string | null>(null);

  const announcementsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'announcements'), orderBy('updatedAt', 'desc')) : null), [firestore]);
  const { data: announcements, isLoading: isLoadingAnn } = useCollection<Announcement>(announcementsQuery, { ignorePermissionErrors: true });

  const handleSave = async (formData: any) => {
    if (!firestore) return;
    try {
        if (formData.targetType === 'global') {
            await addDocumentNonBlocking(collection(firestore, 'announcements'), {
                message: formData.message, isActive: formData.isActive, targetGrade: formData.targetGrade, type: formData.category, updatedAt: new Date().toISOString(),
            });
            toast({ title: 'تم إرسال الإعلان العام بنجاح.' });
        } else {
            await addDocumentNonBlocking(collection(firestore, `users/${formData.studentId}/notifications`), {
                message: formData.message, createdAt: new Date().toISOString(), isRead: false, type: formData.category === 'normal' ? 'general' : formData.category, fromAdmin: true, studentId: formData.studentId, studentName: formData.studentName,
            });
            toast({ title: `تم إرسال الرسالة إلى ${formData.studentName} بنجاح.` });
        }
        setIsAddDialogOpen(false);
    } catch (error) {
        toast({ title: 'حدث خطأ أثناء الإرسال', variant: 'destructive' });
    }
  }

  const handleDelete = async () => {
    if (!firestore || !deleteDialogId) return;
    try {
        await deleteDocumentNonBlocking(doc(firestore, 'announcements', deleteDialogId));
        toast({ title: 'تم حذف الإعلان بنجاح.' });
    } catch (error) {
        toast({ title: 'فشل الحذف', variant: 'destructive' });
    } finally {
        setDeleteDialogId(null);
    }
  }

  const handleToggleActive = async (announcement: Announcement) => {
    if(!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'announcements', announcement.id), { isActive: !announcement.isActive, updatedAt: new Date().toISOString() });
  }

  if (isLoadingAnn) {
    return <div className="flex h-[60vh] w-full items-center justify-center"><LoadingAnimation size="md" /></div>;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold md:text-3xl">قسم الرسائل</h1>
        <div className="mr-auto"><Button size="sm" onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="h-4 w-4" /> إرسال رسالة</Button></div>
      </div>
      <Card>
          <CardHeader><CardTitle className="text-right">الإعلانات العامة</CardTitle></CardHeader>
          <CardContent>
              {(!announcements || announcements.length === 0) ? (
                  <div className="text-center py-10 opacity-50">لا توجد إعلانات.</div>
              ) : (
                  <div className="rounded-xl border overflow-hidden">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="text-center">الحالة</TableHead>
                                  <TableHead className="text-right">الرسالة</TableHead>
                                  <TableHead className="text-center">الصف</TableHead>
                                  <TableHead className="text-center">إجراء</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {announcements.map((ann) => (
                                <TableRow key={ann.id}>
                                    <TableCell className="text-center"><Switch checked={ann.isActive} onCheckedChange={() => handleToggleActive(ann)} /></TableCell>
                                    <TableCell className="text-right"><p className="line-clamp-1 text-sm">{ann.message}</p></TableCell>
                                    <TableCell className="text-center"><Badge variant="outline">{gradeMap[ann.targetGrade]}</Badge></TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialogId(ann.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              )}
          </CardContent>
      </Card>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><AnnouncementForm onSave={handleSave} onClose={() => setIsAddDialogOpen(false)} /></DialogContent></Dialog>
      <AlertDialog open={!!deleteDialogId} onOpenChange={(o) => !o && setDeleteDialogId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={handleDelete} className="bg-destructive">حذف</AlertDialogAction><AlertDialogCancel>إلغاء</AlertDialogCancel></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
