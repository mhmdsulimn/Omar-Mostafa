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
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Search, Megaphone, Mail, MessageSquare, User, Wallet, Award, Bell, Eye } from 'lucide-react';
import type { Announcement, Student, Notification } from '@/lib/data';
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
import { Input } from '@/components/ui/input';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { toArabicDigits, cn } from '@/lib/utils';

const gradeMap: Record<string, string> = {
  all: 'الكل',
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
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
            const searchParts = term.split(/\s+/).filter(p => p.length > 0);

            const results = snap.docs
                .map(d => ({ ...d.data() as Student, id: d.id }))
                .filter(s => {
                    if (adminIds.has(s.id)) return false;
                    
                    const firstName = (s.firstName || '').toLowerCase();
                    const lastName = (s.lastName || '').toLowerCase();
                    const fullName = `${firstName} ${lastName}`.trim();
                    const email = (s.email || '').toLowerCase();
                    
                    return searchParts.every(part => 
                        fullName.includes(part) || email.includes(part)
                    );
                });
            setSearchResults(results);
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
            <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-bold">إرسال رسالة جديدة</DialogTitle>
                <DialogDescription className="font-medium">اختر نوع الرسالة والمستهدفين بالأسفل.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6" dir="rtl">
                <div className="space-y-3">
                    <Label className="text-right block w-full font-bold text-xs opacity-70">نوع الرسالة</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={formData.targetType === 'global' ? 'default' : 'outline'} onClick={() => setFormData(prev => ({...prev, targetType: 'global'}))} className="rounded-xl font-bold">إعلان عام (للجميع)</Button>
                        <Button type="button" variant={formData.targetType === 'student' ? 'default' : 'outline'} onClick={() => setFormData(prev => ({...prev, targetType: 'student'}))} className="rounded-xl font-bold">رسالة خاصة (لطالب)</Button>
                    </div>
                </div>
                {formData.targetType === 'global' ? (
                    <div className="space-y-2 text-right">
                        <Label className="font-bold">توجيه الإعلان إلى</Label>
                        <Select dir="rtl" value={formData.targetGrade} onValueChange={(v) => setFormData(prev => ({...prev, targetGrade: v as any}))}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
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
                        <Label className="font-bold">ابحث عن الطالب</Label>
                        <div className="flex gap-2">
                            <Button type="button" size="icon" onClick={handleSearchStudents} disabled={isSearching} className="rounded-xl shrink-0 h-11 w-11">
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                            <Input placeholder="اكتب اسم الطالب هنا..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchStudents())} className="text-right rounded-xl h-11" />
                        </div>
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="mt-2 rounded-xl border bg-muted/50 p-1 space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                                {searchResults.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 hover:bg-background rounded-lg cursor-pointer border border-transparent hover:border-primary/10 transition-all" onClick={() => { setSelectedStudent(s); setSearchResults([]); setSearchTerm(''); }}>
                                        <Badge variant="outline" className="text-[10px] h-5">{gradeMap[s.grade]}</Badge>
                                        <div className="flex items-center gap-2 text-right"><span className="text-xs font-bold">{s.firstName} {s.lastName}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedStudent && (
                            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20 animate-in zoom-in-95 duration-200">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-7 text-destructive hover:bg-destructive/10 rounded-lg">تغيير</Button>
                                <div className='flex items-center gap-2 font-bold text-sm'>
                                    <span className='opacity-60 text-xs'>مرسل إلى:</span>
                                    <span>{selectedStudent.firstName} {selectedStudent.lastName}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="space-y-2 text-right">
                    <Label htmlFor="message" className="font-bold">نص الرسالة</Label>
                    <Textarea id="message" value={formData.message} onChange={e => setFormData(prev => ({...prev, message: e.target.value}))} required disabled={isSaving} className="min-h-[120px] text-right rounded-xl leading-relaxed" placeholder="اكتب محتوى الرسالة هنا..." />
                </div>
            </div>
             <DialogFooter className="gap-2 sm:justify-start">
                <Button type="submit" disabled={isSaving || !formData.message || (formData.targetType === 'student' && !selectedStudent)} className="rounded-xl h-11 px-8 font-bold flex-1 sm:flex-none">
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إرسال الآن
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="rounded-xl h-11 px-6">إلغاء</Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminAnnouncementsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState<{id: string, type: 'announcement' | 'notification', studentId?: string} | null>(null);
  const [viewMessage, setViewMessage] = React.useState<any>(null);

  // جلب الإعلانات العامة
  const announcementsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'announcements'), orderBy('updatedAt', 'desc')) : null), [firestore]);
  const { data: announcements, isLoading: isLoadingAnn } = useCollection<Announcement>(announcementsQuery, { ignorePermissionErrors: true });

  // جلب كافة الطلاب لربط الأسماء
  const usersQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'users') : null), [firestore, user]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<Student>(usersQuery, { ignorePermissionErrors: true });

  // جلب كافة الرسائل عبر كافة الطلاب
  const notificationsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'notifications')) : null),
    [firestore, user]
  );
  const { data: allNotifications, isLoading: isLoadingAllNotifs } = useCollection<Notification>(notificationsQuery, { ignorePermissionErrors: true });

  // تصفية الرسائل الخاصة المرسلة من المسؤول وغير المقروءة فقط
  const privateMessages = React.useMemo(() => {
    if (!allNotifications || !allUsers) return [];
    
    const usersMap = new Map(allUsers.map(u => [u.id, u]));
    
    return allNotifications
        .filter(n => !n.isRead && n.fromAdmin === true) // فلترة: غير مقروءة ومن المسؤول فقط
        .map(n => {
            const sId = n.studentId || (n as any).parentId;
            const student = usersMap.get(sId || '');
            return {
                ...n,
                studentId: sId,
                studentName: student ? `${student.firstName} ${student.lastName}` : (n.studentName || 'طالب غير معروف')
            };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allNotifications, allUsers]);

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
                message: formData.message, 
                createdAt: new Date().toISOString(), 
                isRead: false, 
                type: 'general', 
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
    if (!firestore || !deleteDialog) return;
    try {
        if (deleteDialog.type === 'announcement') {
            await deleteDocumentNonBlocking(doc(firestore, 'announcements', deleteDialog.id));
        } else if (deleteDialog.studentId) {
            await deleteDocumentNonBlocking(doc(firestore, `users/${deleteDialog.studentId}/notifications`, deleteDialog.id));
        }
        toast({ title: 'تم حذف الرسالة بنجاح.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'فشل الحذف' });
    } finally {
        setDeleteDialog(null);
    }
  }

  const handleToggleActive = async (announcement: Announcement) => {
    if(!firestore) return;
    await updateDocumentNonBlocking(doc(firestore, 'announcements', announcement.id), { isActive: !announcement.isActive, updatedAt: new Date().toISOString() });
  }

  const isLoading = isLoadingAnn || isLoadingUsers || isLoadingAllNotifs;

  if (isLoading) {
    return <div className="flex h-[60vh] w-full items-center justify-center"><LoadingAnimation size="md" /></div>;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6" dir="rtl">
        <h1 className="text-xl font-bold md:text-3xl tracking-tight text-right w-full">إدارة المراسلات</h1>
        <div className="mr-auto shrink-0"><Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="rounded-xl gap-2 font-bold h-10 px-5 shadow-lg shadow-primary/20"><PlusCircle className="h-4 w-4" /> إنشاء رسالة</Button></div>
      </div>

      <div className="grid gap-8">
        {/* جدول الإعلانات العامة */}
        <Card className="rounded-2xl border-none shadow-none md:border md:shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between p-4 md:p-6" dir="rtl">
                <div className='text-right w-full'>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 justify-start">
                        <Megaphone className='h-4 w-4 text-primary' />
                        الإعلانات العامة
                    </CardTitle>
                    <CardDescription className='font-medium text-xs pr-6'>تظهر لجميع الطلاب المشتركين في الصف المحدد.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {(!announcements || announcements.length === 0) ? (
                    <div className="text-center py-16 opacity-50 font-bold">لا توجد إعلانات عامة حالياً.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow>
                                    <TableHead className="text-center font-bold">الحالة</TableHead>
                                    <TableHead className="text-right font-bold">محتوى الإعلان</TableHead>
                                    <TableHead className="text-center font-bold">الصف</TableHead>
                                    <TableHead className="text-center font-bold w-[100px]">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {announcements.map((ann) => (
                                    <TableRow key={ann.id} className="hover:bg-muted/30">
                                        <TableCell className="text-center">
                                            <Switch checked={ann.isActive} onCheckedChange={() => handleToggleActive(ann)} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <p className="line-clamp-1 text-sm font-bold opacity-80" dir="rtl">{ann.message}</p>
                                            <p className='text-[10px] text-muted-foreground font-bold mt-1'>{toArabicDigits(format(new Date(ann.updatedAt), 'pp - d MMMM yyyy', { locale: arSA }))}</p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="rounded-lg font-bold text-[10px]">{gradeMap[ann.targetGrade]}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-lg h-8 w-8" onClick={() => setViewMessage({ ...ann, studentName: 'إعلان عام' })}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8" onClick={() => setDeleteDialog({id: ann.id, type: 'announcement'})}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* جدول الرسائل الخاصة غير المقروءة */}
        <Card className="rounded-2xl border-none shadow-none md:border md:shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-6" dir="rtl">
                <div className='text-right'>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 justify-start">
                        <Mail className='h-4 w-4 text-amber-500' />
                        الرسائل الخاصة غير المقروءة
                    </CardTitle>
                    <CardDescription className='font-medium text-xs pr-6'>الرسائل التي أرسلتها للطلاب ولم يفتحوها بعد.</CardDescription>
                </div>
                {privateMessages && privateMessages.length > 0 && (
                  <div className="flex items-center justify-center w-full md:w-auto">
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black px-4 py-1.5 rounded-full shadow-sm shadow-amber-500/5 animate-in zoom-in-50 duration-300 whitespace-nowrap text-center">
                      {privateMessages.length} رسالة قيد الانتظار
                    </Badge>
                  </div>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {(!privateMessages || privateMessages.length === 0) ? (
                    <div className="text-center py-16 opacity-50 font-bold flex flex-col items-center gap-2">
                        <MessageSquare className='h-8 w-8 opacity-20' />
                        <span>لا توجد رسائل خاصة قيد الانتظار حالياً.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow>
                                    <TableHead className="text-right font-bold">الطالب</TableHead>
                                    <TableHead className="text-center font-bold w-[120px]">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {privateMessages.map((msg) => {
                                    return (
                                        <TableRow key={msg.id} className="hover:bg-muted/30">
                                            <TableCell className="text-right">
                                                <div className='flex items-center gap-2 justify-start' dir="rtl">
                                                    <div className='text-right'>
                                                        <p className='text-xs font-bold whitespace-nowrap'>{msg.studentName || 'طالب'}</p>
                                                        <p className='text-[9px] text-muted-foreground font-bold' dir="rtl">{toArabicDigits(format(new Date(msg.createdAt), 'pp - d MMMM yyyy', { locale: arSA }))}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-lg h-8 w-8" onClick={() => setViewMessage(msg)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8" onClick={() => setDeleteDialog({id: msg.id, type: 'notification', studentId: msg.studentId})}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
      </div>

      {/* نافذة عرض محتوى الرسالة */}
      <Dialog open={!!viewMessage} onOpenChange={(o) => !o && setViewMessage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-2xl">
            <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 justify-start" dir="rtl">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    محتوى الرسالة المرسلة
                </DialogTitle>
                <DialogDescription className="font-bold pt-2 text-right" dir="rtl">
                    <div className="flex flex-col gap-1">
                        <span className="text-foreground">مرسلة إلى: {viewMessage?.studentName}</span>
                        <span className="text-[10px] text-muted-foreground">{viewMessage?.createdAt && toArabicDigits(format(new Date(viewMessage.createdAt), 'pp - d MMMM yyyy', { locale: arSA }))}</span>
                    </div>
                </DialogDescription>
            </DialogHeader>
            <div className="py-6 px-1">
                <div className="p-5 bg-muted/30 rounded-2xl border border-dashed border-primary/10 text-right leading-relaxed font-medium whitespace-pre-wrap text-sm md:text-base" dir="rtl">
                    {viewMessage?.message}
                </div>
            </div>
            <DialogFooter className="sm:justify-start">
                <Button onClick={() => setViewMessage(null)} className="rounded-xl font-bold h-11 px-8">إغلاق</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-2xl">
            <AnnouncementForm onSave={handleSave} onClose={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-md">
            <AlertDialogHeader className="text-right">
                <AlertDialogTitle className="font-bold">تأكيد الحذف النهائي</AlertDialogTitle>
                <AlertDialogDescription className="text-right font-medium leading-relaxed">
                    {deleteDialog?.type === 'announcement' 
                        ? 'سيتم حذف هذا الإعلان العام نهائياً ولن يظهر لأي طالب مجدداً.' 
                        : 'سيتم مسح هذه الرسالة الخاصة من صندوق الوارد الخاص بالطالب.'}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-start">
                <AlertDialogCancel className="rounded-xl font-bold">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
