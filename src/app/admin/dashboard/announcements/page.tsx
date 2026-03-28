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
import { collection, doc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
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
            } catch (e) {
                console.error("Failed to fetch admin list for filtering", e);
            }
        };
        fetchAdmins();
    }, [firestore]);

    const handleSearchStudents = async () => {
        if (!searchTerm.trim() || !firestore) return;
        setIsSearching(true);
        try {
            const studentsRef = collection(firestore, 'users');
            const snap = await getDocs(query(studentsRef, limit(100)));
            const term = searchTerm.toLowerCase();
            const results = snap.docs
                .map(d => ({ ...d.data() as Student, id: d.id }))
                .filter(s => {
                    if (adminIds.has(s.id)) return false;
                    return (
                        s.firstName?.toLowerCase().includes(term) || 
                        s.lastName?.toLowerCase().includes(term) || 
                        s.email?.toLowerCase().includes(term)
                    );
                });
            setSearchResults(results.slice(0, 5));
        } catch (e) {
            console.error(e);
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
                <DialogDescription className="text-right">
                  اختر نوع الرسالة والمستهدفين بدقة.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label className="text-right block w-full">نوع الرسالة</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            type="button" 
                            variant={formData.targetType === 'global' ? 'default' : 'outline'}
                            onClick={() => setFormData(prev => ({...prev, targetType: 'global'}))}
                            className="h-10"
                        >
                            <Megaphone className="ml-2 h-4 w-4" />
                            إعلان عام
                        </Button>
                        <Button 
                            type="button" 
                            variant={formData.targetType === 'student' ? 'default' : 'outline'}
                            onClick={() => setFormData(prev => ({...prev, targetType: 'student'}))}
                            className="h-10"
                        >
                            <User className="ml-2 h-4 w-4" />
                            رسالة خاصة
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-right block w-full">تصنيف الرسالة</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Button 
                            type="button" 
                            variant={formData.category === 'normal' ? 'secondary' : 'outline'}
                            onClick={() => setFormData(prev => ({...prev, category: 'normal'}))}
                            className={`h-10 text-xs ${formData.category === 'normal' ? 'ring-2 ring-primary' : ''}`}
                        >
                            <Bell className="ml-1 h-3 w-3" />
                            عادية
                        </Button>
                        <Button 
                            type="button" 
                            variant={formData.category === 'congratulation' ? 'secondary' : 'outline'}
                            onClick={() => setFormData(prev => ({...prev, category: 'congratulation'}))}
                            className={`h-10 text-xs text-green-600 ${formData.category === 'congratulation' ? 'bg-green-50 ring-2 ring-green-500' : ''}`}
                        >
                            <Sparkles className="ml-1 h-3 w-3" />
                            تهنئة
                        </Button>
                        <Button 
                            type="button" 
                            variant={formData.category === 'warning' ? 'secondary' : 'outline'}
                            onClick={() => setFormData(prev => ({...prev, category: 'warning'}))}
                            className={`h-10 text-xs text-destructive ${formData.category === 'warning' ? 'bg-red-50 ring-2 ring-destructive' : ''}`}
                        >
                            <AlertTriangle className="ml-1 h-3 w-3" />
                            تحذير
                        </Button>
                    </div>
                </div>

                {formData.targetType === 'global' ? (
                    <div className="space-y-2 text-right">
                        <Label htmlFor="target-grade">توجيه الإعلان إلى</Label>
                        <Select dir="rtl" value={formData.targetGrade} onValueChange={(value) => setFormData(prev => ({...prev, targetGrade: value as any}))} disabled={isSaving}>
                            <SelectTrigger id="target-grade">
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
                ) : (
                    <div className="space-y-2 text-right">
                        <Label>ابحث عن الطالب</Label>
                        <div className="flex gap-2">
                            <Button type="button" size="icon" onClick={handleSearchStudents} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                            <Input 
                                placeholder="الاسم أو البريد..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchStudents())}
                                className="text-right"
                            />
                        </div>
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="mt-2 rounded-lg border bg-muted/50 p-1 space-y-1">
                                {searchResults.map(s => (
                                    <div 
                                        key={s.id} 
                                        className="flex items-center justify-between p-2 hover:bg-background rounded cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedStudent(s);
                                            setSearchResults([]);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <Badge variant="outline" className="text-[10px]">{gradeMap[s.grade]}</Badge>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold">{s.firstName} {s.lastName}</span>
                                            <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{s.firstName[0]}</AvatarFallback></Avatar>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedStudent && (
                            <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-7 text-destructive">تغيير</Button>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                                    <Badge variant="default" className="h-6 w-6 rounded-full p-0 flex items-center justify-center"><CheckCircle2 className="h-3 w-3" /></Badge>
                                </div>
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
                    {formData.targetType === 'global' ? 'إرسال الإعلان' : 'إرسال للطالب'}
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

  const adminDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null), [firestore, user]);
  const { data: isAdminRole, isLoading: isCheckingAdmin } = useDoc(adminDocRef);

  const announcementsQuery = useMemoFirebase(
    () => (firestore && isAdminRole) ? query(collection(firestore, 'announcements'), orderBy('updatedAt', 'desc')) : null,
    [firestore, !!isAdminRole]
  );
  const { data: announcements, isLoading: isLoadingAnn } = useCollection<Announcement>(announcementsQuery, { ignorePermissionErrors: true });

  const handleSave = async (formData: any) => {
    if (!firestore || !user) return;
    
    try {
        if (formData.targetType === 'global') {
            await addDocumentNonBlocking(collection(firestore, 'announcements'), {
                message: formData.message,
                isActive: formData.isActive,
                targetGrade: formData.targetGrade,
                type: formData.category,
                updatedAt: new Date().toISOString(),
            });
            toast({ title: 'تم إرسال الإعلان العام بنجاح.' });
        } else {
            await addDocumentNonBlocking(collection(firestore, `users/${formData.studentId}/notifications`), {
                message: formData.message,
                createdAt: new Date().toISOString(),
                isRead: false,
                type: formData.category === 'normal' ? 'general' : formData.category,
                fromAdmin: true,
                studentId: formData.studentId,
                studentName: formData.studentName,
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
    await updateDocumentNonBlocking(doc(firestore, 'announcements', announcement.id), { 
      isActive: !announcement.isActive,
      updatedAt: new Date().toISOString(),
    });
    toast({ title: `تم ${!announcement.isActive ? 'تفعيل' : 'إلغاء تفعيل'} الإعلان` });
  }

  if (isCheckingAdmin || isLoadingAnn) {
    return (
        <div className="flex h-[60vh] w-full items-center justify-center">
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold md:text-3xl">قسم الرسائل</h1>
        <div className="mr-auto">
            <Button size="sm" className="h-10 gap-2 shadow-md" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                <span>إرسال رسالة جديدة</span>
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
          <CardHeader>
              <CardTitle className="text-right text-lg">الإعلانات العامة المثبتة</CardTitle>
              <CardDescription className="text-right">رسائل تظهر لجميع الطلاب في أعلى قائمة الإشعارات.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 md:px-6">
              {(!announcements || announcements.length === 0) ? (
                  <div className="text-center py-16 opacity-50 bg-muted/20 rounded-2xl border-2 border-dashed">لا توجد إعلانات حالياً.</div>
              ) : (
                  <div className="rounded-xl border overflow-hidden">
                      <Table>
                          <TableHeader className="bg-muted/30">
                              <TableRow>
                                  <TableHead className="text-center w-[80px]">الحالة</TableHead>
                                  <TableHead className="text-right">الرسالة</TableHead>
                                  <TableHead className="text-center">النوع</TableHead>
                                  <TableHead className="text-center">الصف</TableHead>
                                  <TableHead className="text-right">التاريخ</TableHead>
                                  <TableHead className="text-center">إجراء</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {announcements.map((ann) => {
                                  const category = categoryMap[ann.type || 'normal'];
                                  const Icon = category.icon;
                                  return (
                                    <TableRow key={ann.id}>
                                        <TableCell className="text-center">
                                            <Switch checked={ann.isActive} onCheckedChange={() => handleToggleActive(ann)} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium"><p className="line-clamp-2 text-sm">{ann.message}</p></TableCell>
                                        <TableCell className="text-center">
                                            <div className={`flex items-center justify-center gap-1 text-[10px] font-bold ${category.color}`}>
                                                <Icon className="h-3 w-3" />
                                                <span>{category.label}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center"><Badge variant="outline">{gradeMap[ann.targetGrade]}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col text-[10px] md:text-xs">
                                                <span>{format(new Date(ann.updatedAt), 'd MMM yyyy', { locale: arSA })}</span>
                                                <span className="text-muted-foreground">{format(new Date(ann.updatedAt), 'h:mm a', { locale: arSA })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogId(ann.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                  );
                              })}
                          </TableBody>
                      </Table>
                  </div>
              )}
          </CardContent>
      </Card>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-2xl">
            <AnnouncementForm
                onSave={handleSave}
                onClose={() => setIsAddDialogOpen(false)}
            />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialogId} onOpenChange={(open) => !open && setDeleteDialogId(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم حذف الإعلان نهائياً من قاعدة البيانات ومن عند جميع الطلاب. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف نهائي</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
