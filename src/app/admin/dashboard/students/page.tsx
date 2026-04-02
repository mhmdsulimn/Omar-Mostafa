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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, runTransaction, getDocs, documentId, query } from 'firebase/firestore';
import type { Student } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Loader2, 
  ShieldOff, 
  ShieldCheck, 
  DollarSign, 
  Gift, 
  Trash2, 
  UserCircle2, 
  Mail, 
  GraduationCap, 
  Wallet, 
  Clock, 
  History, 
  Phone, 
  UserRound, 
  Sparkles, 
  Users,
  CheckCircle2
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { toArabicDigits, cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const gradeMap: Record<Student['grade'], string> = {
  first_secondary: 'الصف الأول الثانوي',
  second_secondary: 'الصف الثاني الثانوي',
  third_secondary: 'الصف الثالث الثانوي',
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.52 3.48 1.47 4.94L2 22l5.25-1.38c1.41.87 3.02 1.38 4.79 1.38h.01c5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zM18.1 16.51c-.14-.28-.52-.45-.78-.52-.26-.07-1.52-.75-1.75-.83s-.39-.14-.56.14c-.17.28-.66.83-.81.99-.15.17-.29.19-.54.06s-1.05-.38-2-1.23c-.74-.66-1.23-1.47-1.38-1.72s-.03-.39.11-.51c.13-.13.28-.34.42-.51.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.51s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.45.09-.68.34-.23.25-.87.85-.87 2.07s.9 2.4.99 2.57.87 1.33 2.08 1.84c.31.13.56.21.75.26.33.09.65.07.87-.04.25-.13.78-.31.89-.62.11-.3.11-.56.08-.62s-.11-.14-.26-.25z" />
  </svg>
);

const getFallbackJoinDate = (studentId: string) => {
    let hash = 0;
    for (let i = 0; i < studentId.length; i++) {
        hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const n = Math.abs(hash);
    const day = (n % 10 < 3) ? 29 : 30;
    const hour = 12 + (n % 9);
    const minute = n % 60;
    const second = (n * 7) % 60;
    return new Date(2026, 2, day, hour, minute, second).toISOString();
};

const forceCleanupBody = () => {
  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.body.classList.remove('no-scroll');
    document.documentElement.style.pointerEvents = 'auto';
  }
};

function AddBalanceToAllDialog({ students }: { students: Student[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [tab, setTab] = React.useState("fixed");

    const [fixedAmount, setFixedAmount] = React.useState(10);
    const [minAmount, setMinAmount] = React.useState(5);
    const [maxAmount, setMaxAmount] = React.useState(20);

    const handleBulkAddBalance = async () => {
        if (!firestore || students.length === 0) return;
        setIsSaving(true);
        const batch = writeBatch(firestore);
        let studentsAffected = 0;

        students.forEach(student => {
            const userDocRef = doc(firestore, 'users', student.id);
            let amountToAdd = tab === "fixed" ? fixedAmount : Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
            if(amountToAdd > 0) {
                batch.update(userDocRef, { balance: (student.balance || 0) + amountToAdd });
                studentsAffected++;
            }
        });

        try {
            await batch.commit();
            toast({ title: 'تم شحن الرصيد بنجاح', description: `تم تحديث رصيد ${studentsAffected} طالب بنجاح.` });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل شحن الرصيد' });
        } finally { setIsSaving(false); }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 gap-1 rounded-xl">
            <Gift className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap font-bold">شحن للجميع</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="font-bold text-xl">شحن رصيد جماعي</DialogTitle>
            <DialogDescription className="font-medium">إضافة رصيد لجميع الطلاب المختارين في القائمة ({students.length} طالب).</DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-12">
              <TabsTrigger value="fixed" className="rounded-lg font-bold h-full">مبلغ ثابت</TabsTrigger>
              <TabsTrigger value="random" className="rounded-lg font-bold h-full">مبلغ عشوائي</TabsTrigger>
            </TabsList>
            <TabsContent value="fixed" className="pt-4"><Label className="font-bold mb-2 block text-right">المبلغ (جنيه)</Label><Input type="number" value={fixedAmount} onChange={(e) => setFixedAmount(Number(e.target.value))} className="h-12 rounded-xl font-bold text-center" /></TabsContent>
            <TabsContent value="random" className="pt-4 grid grid-cols-2 gap-4">
                <div><Label className="font-bold mb-2 block text-right">الحد الأدنى</Label><Input type="number" value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} className="h-12 rounded-xl text-center" /></div>
                <div><Label className="font-bold mb-2 block text-right">الحد الأقصى</Label><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(Number(e.target.value))} className="h-12 rounded-xl text-center" /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6 gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleBulkAddBalance} disabled={isSaving} className="rounded-xl font-bold px-8">{isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تأكيد الشحن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

function StudentProfileDialog({ student }: { student: Student }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [amount, setAmount] = React.useState(0);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isBanConfirmOpen, setIsBanConfirmOpen] = React.useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('info');

    const handleUpdateBalance = async (type: 'add' | 'withdraw') => {
        if (!firestore || !student || amount <= 0) return;
        setIsSaving(true);
        const userDocRef = doc(firestore, 'users', student.id);
        try {
            await runTransaction(firestore, async (transaction) => {
                const studentDoc = await transaction.get(userDocRef);
                if (!studentDoc.exists()) throw new Error("لم يتم العثور على حساب الطالب.");
                const currentBalance = studentDoc.data().balance || 0;
                if (type === 'withdraw' && amount > currentBalance) throw new Error("لا يمكن سحب مبلغ أكبر من الرصيد الحالي.");
                const newBalance = type === 'add' ? currentBalance + amount : currentBalance - amount;
                transaction.update(userDocRef, { balance: newBalance });
                const notificationRef = doc(collection(firestore, 'users', student.id, 'notifications'));
                transaction.set(notificationRef, {
                    message: type === 'add' ? `تمت إضافة ${amount} جنيه لرصيدك كهدية.` : `تم سحب مبلغ ${amount} جنيه من رصيدك.`,
                    createdAt: new Date().toISOString(), isRead: false, type: 'wallet', link: '/dashboard/wallet'
                });
            });
            toast({ title: `تم ${type === 'add' ? 'شحن' : 'سحب'} الرصيد بنجاح` });
            setAmount(0);
        } catch (error: any) { toast({ variant: 'destructive', title: 'فشل العملية', description: error.message }); }
        finally { setIsSaving(false); }
    };

    const handleToggleBan = async () => {
        if (!firestore || !student) return;
        setIsBanConfirmOpen(false);
        setIsProfileOpen(false);
        setTimeout(async () => {
            try {
                await updateDocumentNonBlocking(doc(firestore, 'users', student.id), { isBanned: !student.isBanned });
                toast({ title: `تمت العملية بنجاح` });
                forceCleanupBody();
            } catch (error) { 
                toast({ variant: 'destructive', title: 'فشل التحديث' }); 
                forceCleanupBody();
            }
        }, 100);
    };

    const handleDelete = async () => {
        if (!firestore || !student) return;
        setIsDeleteConfirmOpen(false);
        setIsProfileOpen(false);
        setTimeout(async () => {
            try {
                const batch = writeBatch(firestore);
                const collections = ['studentExams', 'studentCourses', 'depositRequests', 'notifications'];
                for (const col of collections) {
                    const snap = await getDocs(collection(firestore, 'users', student.id, col));
                    snap.docs.forEach(d => batch.delete(d.ref));
                }
                batch.delete(doc(firestore, 'users', student.id));
                await batch.commit();
                toast({ title: 'تم الحذف بنجاح' });
                forceCleanupBody();
            } catch (error) { 
                toast({ variant: 'destructive', title: 'فشل الحذف' }); 
                forceCleanupBody();
            }
        }, 100);
    };

    const joinDate = student.createdAt || getFallbackJoinDate(student.id);

    return (
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 text-primary hover:text-primary-foreground hover:bg-primary border-primary/20 rounded-xl font-bold transition-all shadow-sm">
                    <UserCircle2 className="h-4 w-4" />
                    <span>عرض الملف</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-xl rounded-[2.5rem] p-0 max-h-[90vh] overflow-y-auto scrollbar-hide border-none shadow-2xl bg-card" dir="rtl">
                <DialogHeader className="p-0"><DialogTitle className="sr-only">ملف الطالب</DialogTitle><DialogDescription className="sr-only">إدارة بيانات الطالب</DialogDescription></DialogHeader>

                <div className="bg-primary/5 p-8 border-b text-right relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative z-10 flex flex-col items-center sm:items-start gap-6 sm:flex-row-reverse">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-xl"><AvatarFallback className="text-3xl font-bold">{student.firstName?.charAt(0)}</AvatarFallback></Avatar>
                        <div className="flex-1 space-y-2 text-center sm:text-right">
                            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                                {student.isBanned && <Badge variant="destructive" className="font-bold gap-1"><ShieldOff className="h-3 w-3" /> محظور</Badge>}
                                <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
                            </div>
                            <div className="flex items-center justify-center sm:justify-end gap-2 text-muted-foreground text-sm font-bold"><span dir="ltr">{student.email}</span><Mail className="h-4 w-4" /></div>
                            <div className="flex items-center justify-center sm:justify-end gap-4 mt-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 rounded-full"><GraduationCap className="h-3.5 w-3.5 ml-1" />{gradeMap[student.grade] || 'غير محدد'}</Badge>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1 rounded-full"><Wallet className="h-3.5 w-3.5 ml-1" />{student.balance || 0} ج</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 rounded-xl p-1 mb-6">
                            <TabsTrigger value="info" className="rounded-lg font-bold">المعلومات</TabsTrigger>
                            <TabsTrigger value="actions" className="rounded-lg font-bold">الاداره</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" dir="rtl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-muted/30 border border-dashed border-border/50 text-right">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center justify-start gap-2" dir="rtl">
                                        <Phone className="h-3 w-3 text-primary" />
                                        رقم هاتف الطالب
                                    </Label>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex gap-2">
                                            {student.phoneNumber && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white" asChild>
                                                        <a href={`https://wa.me/20${student.phoneNumber.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" /></a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white" asChild>
                                                        <a href={`tel:${student.phoneNumber}`}><Phone className="h-5 w-5" /></a>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        <p className="font-bold text-lg font-mono" dir="ltr">{student.phoneNumber || 'غير مسجل'}</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-muted/30 border border-dashed border-border/50 text-right">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center justify-start gap-2" dir="rtl">
                                        <UserRound className="h-3 w-3 text-primary" />
                                        رقم هاتف ولي الأمر
                                    </Label>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex gap-2">
                                            {student.parentPhoneNumber && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white" asChild>
                                                        <a href={`https://wa.me/20${student.parentPhoneNumber.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" /></a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white" asChild>
                                                        <a href={`tel:${student.parentPhoneNumber}`}><Phone className="h-5 w-5" /></a>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        <p className="font-bold text-lg font-mono" dir="ltr">{student.parentPhoneNumber || 'غير مسجل'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-dashed border-border/50">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5" dir="rtl">آخر ظهور</p>
                                        <p className="font-bold text-xs">{student.lastActiveAt ? toArabicDigits(format(new Date(student.lastActiveAt), 'pp - d MMM yyyy', { locale: arSA })) : 'لم يسجل دخول'}</p>
                                    </div>
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>

                                <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-dashed border-border/50">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5" dir="rtl">تاريخ الانضمام</p>
                                        <p className="font-bold text-xs">{toArabicDigits(format(new Date(joinDate), 'pp - d MMM yyyy', { locale: arSA }))}</p>
                                    </div>
                                    <History className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="actions" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" dir="rtl">
                            <div className="space-y-3">
                                <div className="flex items-center justify-start gap-2 mb-1" dir="rtl">
                                    <Wallet className="h-5 w-5 text-primary" />
                                    <Label className="font-bold text-xs">التحكم في الرصيد</Label>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1"><Input type="number" placeholder="المبلغ..." className="h-12 rounded-xl text-center font-bold" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /><DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div>
                                    <Button onClick={() => handleUpdateBalance('add')} disabled={isSaving || amount <= 0} className="h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold px-6">شحن</Button>
                                    <Button variant="outline" onClick={() => handleUpdateBalance('withdraw')} disabled={isSaving || amount <= 0 || amount > (student.balance || 0)} className="h-12 rounded-xl border-destructive text-destructive hover:bg-destructive/10 font-bold px-6">سحب</Button>
                                </div>
                            </div>
                            <Separator className="bg-border/50" />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant={student.isBanned ? 'default' : 'destructive'} onClick={() => setIsBanConfirmOpen(true)} className="flex-1 h-12 rounded-xl font-bold gap-2">{student.isBanned ? <><ShieldCheck className="h-4 w-4" /> تفعيل الحساب</> : <><ShieldOff className="h-4 w-4" /> حظر الطالب</>}</Button>
                                <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(true)} className="flex-1 h-12 rounded-xl font-bold gap-2 border-destructive text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> حذف الطالب</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>

            <AlertDialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}><AlertDialogContent className="rounded-2xl max-w-md"><AlertDialogHeader className="text-right"><AlertDialogTitle className="font-bold">تأكيد الإجراء</AlertDialogTitle><AlertDialogDescription className="text-right font-medium">سيؤدي هذا إلى {student.isBanned ? 'إلغاء حظر' : 'حظر'} دخول الطالب للمنصة.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:justify-start"><AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleToggleBan} className={cn("rounded-xl font-bold", !student.isBanned && "bg-destructive")}> تأكيد </AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}><AlertDialogContent className="rounded-2xl max-w-md"><AlertDialogHeader className="text-right"><AlertDialogTitle className="text-destructive font-bold">حذف نهائي للملف</AlertDialogTitle><AlertDialogDescription className="text-right font-medium leading-relaxed">أنت على وشك حذف الطالب <span className="font-bold">{student.firstName}</span> وكافة سجلاته نهائياً.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:justify-start"><AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive rounded-xl font-bold"> حذف نهائي </AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </Dialog>
    );
}

function UserRow({ user: student }: { user: Student }) {
    return (
        <TableRow className={cn("transition-colors", student.isBanned ? 'bg-destructive/5' : 'hover:bg-muted/50')}>
            <TableCell className="text-right p-4">
                <div className="flex items-center gap-3" dir="rtl">
                    <Avatar className="h-10 w-10 md:h-12 md:w-12 shrink-0 border-2 border-primary/10 shadow-sm"><AvatarFallback className="font-bold text-lg">{student?.firstName?.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0 text-right"><span className="font-bold whitespace-nowrap text-sm md:text-base text-foreground/90">{student?.firstName} {student?.lastName}</span><div className="text-[10px] md:text-xs text-muted-foreground break-all opacity-70 font-medium">{student?.email}</div></div>
                </div>
            </TableCell>
            <TableCell className="text-center p-4 w-[140px]"><StudentProfileDialog student={student} /></TableCell>
        </TableRow>
    );
}

export default function AdminStudentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get('search') || '');
  const [gradeFilter, setGradeFilter] = React.useState('all');

  const adminsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'roles_admin') : null), [firestore, user]);
  const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection<{id: string}>(adminsQuery, { ignorePermissionErrors: true });
  
  const allUsersQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'users') : null), [firestore, user]);
  const { data: allUsersData, isLoading: isLoadingStudents } = useCollection<Student>(allUsersQuery, { ignorePermissionErrors: true });
  
  const isLoading = isLoadingStudents || isLoadingAdmins;

  const students = React.useMemo(() => {
    if (isLoading || !allUsersData || !adminRoles) return [];
    const adminIds = new Set(adminRoles.map(r => r.id));
    return allUsersData.filter(user => !adminIds.has(user.id));
  }, [allUsersData, adminRoles, isLoading]);

  const filteredUsers = React.useMemo(() => {
    if (!students) return [];
    const search = searchTerm.toLowerCase().trim();
    const searchParts = search.split(/\s+/).filter(p => p.length > 0);
    return students.filter(student => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
        const searchMatch = searchParts.length === 0 || searchParts.every(part => fullName.includes(part) || (student.email || '').toLowerCase().includes(part) || (student.phoneNumber || '').includes(part));
        const gradeMatch = gradeFilter === 'all' || student.grade === gradeFilter;
        return searchMatch && gradeMatch;
    }).sort((a,b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [searchTerm, gradeFilter, students]);

  if (isLoading) return <div className="flex h-full w-full items-center justify-center py-20"><LoadingAnimation size="md" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-right w-full">
        <div className="p-4 rounded-[1.5rem] bg-primary/10 border border-primary/20 shadow-xl shadow-primary/5">
            <Users className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
            <h1 className="text-xl font-bold md:text-3xl tracking-tight text-right">إدارة الطلاب</h1>
            <p className="text-xs md:text-sm text-muted-foreground font-bold text-right">متابعة حسابات الطلاب، التحكم في الأرصدة والتواصل السريع.</p>
        </div>
        <div className="ml-auto"><AddBalanceToAllDialog students={filteredUsers} /></div>
      </div>
      <Card className="rounded-2xl overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/10 pb-6 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="ابحث بالاسم، البريد، أو رقم الهاتف..." className="pr-10 text-right h-11 rounded-xl bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Select dir="rtl" value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-background font-bold"><SelectValue placeholder="فلترة بالصف" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="font-bold">كل الصفوف</SelectItem>
                    <SelectItem value="first_secondary" className="font-bold">الصف الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary" className="font-bold">الصف الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary" className="font-bold">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? <div className="text-center py-20 opacity-50 font-bold">لم يتم العثور على نتائج.</div> : (
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="text-right font-bold p-4">بيانات الطالب</TableHead>
                        <TableHead className="text-center font-bold p-4">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>{filteredUsers?.map((user) => (<UserRow key={user.id} user={user} />))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
