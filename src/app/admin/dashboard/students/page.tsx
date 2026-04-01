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
import { collection, doc, writeBatch, runTransaction, getDocs } from 'firebase/firestore';
import type { Student } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ShieldOff, ShieldCheck, DollarSign, Gift, Minus, Trash2, UserCircle2, Mail, GraduationCap, Wallet, Clock, History, ExternalLink } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const gradeShortMap: Record<Student['grade'], string> = {
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
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
        if (!firestore || students.length === 0) {
            toast({ variant: 'destructive', title: 'لا يوجد طلاب لتحديثهم.' });
            return;
        }

        setIsSaving(true);
        const batch = writeBatch(firestore);
        let studentsAffected = 0;

        students.forEach(student => {
            const userDocRef = doc(firestore, 'users', student.id);
            let amountToAdd = 0;

            if (tab === "fixed") {
                amountToAdd = fixedAmount;
            } else {
                amountToAdd = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
            }

            if(amountToAdd > 0) {
                const currentBalance = student.balance || 0;
                const newBalance = currentBalance + amountToAdd;
                batch.update(userDocRef, { balance: newBalance });
                studentsAffected++;
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'تم شحن الرصيد بنجاح',
                description: `تم تحديث رصيد ${studentsAffected} طالب بنجاح.`,
            });
            setIsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل شحن الرصيد' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        شحن رصيد للجميع
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>شحن رصيد لجميع الطلاب</DialogTitle>
                    <DialogDescription>
                        إضافة رصيد إلى محفظة جميع الطلاب ({students.length} طالب) في القائمة الحالية.
                    </DialogDescription>
                </DialogHeader>
                 <Tabs value={tab} onValueChange={setTab} className="w-full" dir="rtl">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="fixed" className="rounded-lg">مبلغ ثابت</TabsTrigger>
                        <TabsTrigger value="random" className="rounded-lg">مبلغ عشوائي</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fixed" className="pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="fixedAmount">المبلغ المراد إضافته (بالجنيه)</Label>
                            <Input id="fixedAmount" type="number" value={fixedAmount} onChange={(e) => setFixedAmount(Number(e.target.value))} min="1" disabled={isSaving} className="rounded-xl" />
                        </div>
                    </TabsContent>
                    <TabsContent value="random" className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minAmount">الحد الأدنى</Label>
                                <Input id="minAmount" type="number" value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} min="1" disabled={isSaving} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxAmount">الحد الأقصى</Label>
                                <Input id="maxAmount" type="number" value={maxAmount} onChange={(e) => setMaxAmount(Number(e.target.value))} min={minAmount} disabled={isSaving} className="rounded-xl" />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="rounded-xl">إلغاء</Button>
                    <Button onClick={handleBulkAddBalance} disabled={isSaving} className="rounded-xl">
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        تأكيد الشحن
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StudentProfileDialog({ student }: { student: Student }) {
    const firestore = useFirestore();
    const { toast } = useToast();
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
                    message: type === 'add' 
                        ? `تمت إضافة ${amount} جنيه إلى رصيدك كهدية من الإدارة.` 
                        : `تم سحب مبلغ ${amount} جنيه من رصيدك بواسطة الإدارة.`,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    type: 'wallet',
                    link: '/dashboard/wallet'
                });
            });
            toast({ title: `تم ${type === 'add' ? 'شحن' : 'سحب'} الرصيد بنجاح` });
            setAmount(0);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل العملية', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleBan = async () => {
        if (!firestore || !student) return;
        setIsSaving(true);
        const newBanStatus = !student.isBanned;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'users', student.id), { isBanned: newBanStatus });
            toast({ title: `تم ${newBanStatus ? 'حظر' : 'تفعيل'} الطالب بنجاح` });
            setIsBanConfirmOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل التحديث' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !student) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            const examsSnap = await getDocs(collection(firestore, 'users', student.id, 'studentExams'));
            const coursesSnap = await getDocs(collection(firestore, 'users', student.id, 'studentCourses'));
            const depositsSnap = await getDocs(collection(firestore, 'users', student.id, 'depositRequests'));
            const notifsSnap = await getDocs(collection(firestore, 'users', student.id, 'notifications'));
            
            examsSnap.docs.forEach(d => batch.delete(d.ref));
            depositsSnap.docs.forEach(d => batch.delete(d.ref));
            notifsSnap.docs.forEach(d => batch.delete(d.ref));
            
            for (const courseDoc of coursesSnap.docs) {
                const progressSnap = await getDocs(collection(courseDoc.ref, 'progress'));
                progressSnap.docs.forEach(p => batch.delete(p.ref));
                batch.delete(courseDoc.ref);
            }
            batch.delete(doc(firestore, 'users', student.id));
            await batch.commit();
            toast({ title: 'تم حذف الطالب وكافة سجلاته بنجاح' });
            setIsDeleteConfirmOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحذف' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-lg font-bold">
                    <UserCircle2 className="h-4 w-4" />
                    عرض الملف
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
                <div className="bg-primary/5 p-8 border-b text-right relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative z-10 flex flex-col items-center sm:items-start gap-6 sm:flex-row-reverse">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                            <AvatarFallback className="text-3xl font-black">{student.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2 text-center sm:text-right">
                            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                                {student.isBanned && <Badge variant="destructive" className="font-bold gap-1"><ShieldOff className="h-3 w-3" /> محظور</Badge>}
                                <h2 className="text-2xl font-black">{student.firstName} {student.lastName}</h2>
                            </div>
                            <div className="flex items-center justify-center sm:justify-end gap-2 text-muted-foreground text-sm font-bold">
                                <span dir="ltr">{student.email}</span>
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex items-center justify-center sm:justify-end gap-4 mt-2">
                                <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full text-primary text-xs font-black">
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    {gradeMap[student.grade] || 'غير محدد'}
                                </div>
                                <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full text-green-600 text-xs font-black">
                                    <Wallet className="h-3.5 w-3.5" />
                                    {student.balance || 0} ج
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 rounded-xl p-1 mb-6">
                            <TabsTrigger value="info" className="rounded-lg font-bold">معلومات النشاط</TabsTrigger>
                            <TabsTrigger value="actions" className="rounded-lg font-bold">إدارة المحفظة والتحكم</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-dashed border-border/50 flex flex-col gap-1 text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center justify-end gap-1.5"><Clock className="h-3 w-3" /> آخر ظهور</p>
                                    <p className="font-bold text-sm">
                                        {student.lastActiveAt ? toArabicDigits(format(new Date(student.lastActiveAt), 'pp - d MMM yyyy', { locale: arSA })) : 'لم يسجل دخول بعد'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/30 border border-dashed border-border/50 flex flex-col gap-1 text-right">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center justify-end gap-1.5"><History className="h-3 w-3" /> تاريخ الانضمام</p>
                                    <p className="font-bold text-sm text-muted-foreground italic">منذ بداية المسيرة 🎓</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3 text-right">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary"><ExternalLink className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs font-black text-primary mb-1">حالة الجلسة</p>
                                    <p className="text-xs font-bold text-muted-foreground">معرف الجلسة الحالي: <span className="font-mono text-[10px] select-all">{student.currentSessionId || 'لا يوجد'}</span></p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="actions" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <Label className="font-bold text-xs flex items-center justify-end gap-1.5">التحكم في الرصيد <Wallet className="h-3 w-3" /></Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            type="number" 
                                            placeholder="أدخل المبلغ..." 
                                            className="h-12 rounded-xl text-center font-black pr-10" 
                                            value={amount || ''} 
                                            onChange={e => setAmount(Number(e.target.value))}
                                            disabled={isSaving}
                                        />
                                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <Button 
                                        onClick={() => handleUpdateBalance('add')} 
                                        disabled={isSaving || amount <= 0} 
                                        className="h-12 rounded-xl bg-green-600 hover:bg-green-700 gap-1 font-bold px-6"
                                    >
                                        <Gift className="h-4 w-4" /> شحن
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleUpdateBalance('withdraw')} 
                                        disabled={isSaving || amount <= 0} 
                                        className="h-12 rounded-xl border-destructive text-destructive hover:bg-destructive/10 gap-1 font-bold px-6"
                                    >
                                        <Minus className="h-4 w-4" /> سحب
                                    </Button>
                                </div>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button 
                                    variant={student.isBanned ? 'default' : 'destructive'} 
                                    onClick={() => setIsBanConfirmOpen(true)}
                                    disabled={isSaving}
                                    className="flex-1 h-12 rounded-xl font-bold gap-2"
                                >
                                    {student.isBanned ? <><ShieldCheck className="h-4 w-4" /> تفعيل الحساب</> : <><ShieldOff className="h-4 w-4" /> حظر الطالب</>}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                    disabled={isSaving}
                                    className="flex-1 h-12 rounded-xl font-bold gap-2 border-destructive text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" /> حذف الحساب نهائياً
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="bg-muted/30 p-4 border-t px-6">
                    <p className="text-[10px] text-muted-foreground font-bold text-center w-full">إدارة شؤون الطلاب - منصة الأستاذ عمر مصطفى</p>
                </DialogFooter>
            </DialogContent>

            <AlertDialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right">تأكيد الإجراء</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-medium">سيؤدي هذا إلى {student.isBanned ? 'إلغاء حظر' : 'حظر'} الطالب ودخوله للمنصة.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isSaving} className="rounded-xl">إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleBan} className={cn("rounded-xl", !student.isBanned && "bg-destructive")} disabled={isSaving}>
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} تأكيد
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive text-right">حذف نهائي للملف</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-medium leading-relaxed">
                            أنت على وشك حذف الطالب <span className="font-black">{student.firstName}</span> وكافة سجلاته ودرجاته واشتراكاته بشكل نهائي. 
                            <br /><br />
                            <span className="text-destructive font-black">لا يمكن التراجع عن هذا الإجراء!</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isSaving} className="rounded-xl">إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive rounded-xl" disabled={isSaving}>
                            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف نهائي
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}

function UserRow({ user: student }: { user: Student }) {
    return (
        <TableRow className={cn("transition-colors", student.isBanned ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50')}>
            <TableCell className="text-right">
                <div className="flex items-center gap-3" dir="rtl">
                    <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0 border-2 border-primary/10">
                        <AvatarFallback className="font-bold">{student?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0 text-right">
                        <div className="flex items-center justify-start gap-2">
                            <span className="font-bold whitespace-nowrap text-sm md:text-base">
                                {student?.firstName} {student?.lastName}
                            </span>
                            <StudentProfileDialog student={student} />
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground break-all opacity-70">{student?.email}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-bold text-xs md:text-sm">{student.grade ? gradeShortMap[student.grade] : '-'}</TableCell>
            <TableCell className="font-bold whitespace-nowrap text-right text-xs md:text-sm text-primary">{student.balance || 0} ج</TableCell>
            <TableCell className="text-right">
                {student.lastActiveAt ? (
                    <div className="flex flex-col text-right text-[10px] md:text-xs">
                        <span className="font-bold text-foreground/80">{toArabicDigits(format(new Date(student.lastActiveAt), 'd MMM yyyy', { locale: arSA }))}</span>
                        <span className="text-muted-foreground opacity-60">{toArabicDigits(format(new Date(student.lastActiveAt), 'h:mm a', { locale: arSA }))}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground italic text-[10px] md:text-xs opacity-40">غير متوفر</span>
                )}
            </TableCell>
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
        const firstName = (student.firstName || '').toLowerCase();
        const lastName = (student.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = (student.email || '').toLowerCase();
        
        const searchMatch = searchParts.length === 0 || searchParts.every(part => 
            fullName.includes(part) || email.includes(part)
        );
        
        const gradeMatch = gradeFilter === 'all' || student.grade === gradeFilter;
        return searchMatch && gradeMatch;
    }).sort((a,b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }, [searchTerm, gradeFilter, students]);


  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}><LoadingAnimation size="md" /></div>;
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-bold md:text-3xl tracking-tight">إدارة الطلاب</h1>
         <div className="ml-auto flex items-center gap-2"><AddBalanceToAllDialog students={filteredUsers} /></div>
      </div>
      <Card className="animate-fade-in border-none shadow-none md:border md:shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="px-4 md:px-6 bg-muted/10 pb-6">
          <CardTitle className="text-right text-lg">قائمة المنضمين</CardTitle>
          <CardDescription className="text-right font-medium">إدارة حسابات وأرصدة الطلاب ونشاطهم اللحظي.</CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ابحث بالاسم الكامل أو البريد..." className="pr-10 text-right h-11 rounded-xl bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select dir="rtl" value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue placeholder="فلترة بالصف" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">كل الصفوف</SelectItem>
                    <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 pt-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20 opacity-50"><p className="font-bold">لم يتم العثور على طلاب يطابقون بحثك.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="min-w-[250px] text-right font-bold">المستخدم</TableHead>
                    <TableHead className="w-[10%] text-right font-bold">الصف</TableHead>
                    <TableHead className="w-[10%] text-right font-bold">الرصيد</TableHead>
                    <TableHead className="w-[15%] text-right font-bold">آخر ظهور</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (<UserRow key={user.id} user={user} />))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
