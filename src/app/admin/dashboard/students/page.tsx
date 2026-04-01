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
import { Search, Loader2, ShieldOff, ShieldCheck, DollarSign, Gift, Minus, Trash2 } from 'lucide-react';
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

const gradeMap: Record<Student['grade'], string> = {
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

function WithdrawBalanceDialog({ student }: { student: Student }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [amount, setAmount] = React.useState(0);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleWithdrawBalance = async () => {
        if (!firestore || !student || amount <= 0) return;
        setIsSaving(true);
        const userDocRef = doc(firestore, 'users', student.id);
        try {
            await runTransaction(firestore, async (transaction) => {
                 const studentDoc = await transaction.get(userDocRef);
                if (!studentDoc.exists()) throw new Error("لم يتم العثور على حساب الطالب.");
                const currentBalance = studentDoc.data().balance || 0;
                if (amount > currentBalance) throw new Error("لا يمكن سحب مبلغ أكبر من الرصيد الحالي.");
                transaction.update(userDocRef, { balance: currentBalance - amount });
                const notificationRef = doc(collection(firestore, 'users', student.id, 'notifications'));
                transaction.set(notificationRef, {
                    message: `تم سحب مبلغ ${amount} جنيه من رصيدك بواسطة الإدارة.`,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    type: 'wallet',
                    link: '/dashboard/wallet'
                });
            });
            toast({ title: 'تم سحب الرصيد بنجاح' });
            setIsOpen(false);
            setAmount(0);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل سحب الرصيد', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" title="سحب رصيد"><Minus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>سحب رصيد من الطالب</DialogTitle>
                    <DialogDescription>سحب من محفظة: {student.firstName} {student.lastName}</DialogDescription>
                </DialogHeader>
                 <div className="space-y-2 py-4">
                    <Label htmlFor="amount">المبلغ المراد سحبه (بالجنيه)</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min="1" disabled={isSaving} className="rounded-xl" />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="rounded-xl">إلغاء</Button>
                    <Button onClick={handleWithdrawBalance} disabled={isSaving || amount <= 0} variant="destructive" className="rounded-xl">
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        تأكيد السحب
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AddBalanceDialog({ student }: { student: Student }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [amount, setAmount] = React.useState(0);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleAddBalance = async () => {
        if (!firestore || !student || amount <= 0) return;
        setIsSaving(true);
        const userDocRef = doc(firestore, 'users', student.id);
        try {
            await runTransaction(firestore, async (transaction) => {
                const studentDoc = await transaction.get(userDocRef);
                if (!studentDoc.exists()) throw new Error("لم يتم العثور على حساب الطالب.");
                const currentBalance = studentDoc.data().balance || 0;
                transaction.update(userDocRef, { balance: currentBalance + amount });
                const notificationRef = doc(collection(firestore, 'users', student.id, 'notifications'));
                transaction.set(notificationRef, {
                    message: `تمت إضافة ${amount} جنيه إلى رصيدك كهدية من الإدارة.`,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    type: 'wallet',
                    link: '/dashboard/wallet'
                });
            });
            toast({ title: 'تم شحن الرصيد بنجاح' });
            setIsOpen(false);
            setAmount(0);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل شحن الرصيد' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" title="شحن رصيد"><DollarSign className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>شحن رصيد الطالب</DialogTitle>
                    <DialogDescription>إضافة لـ: {student.firstName} {student.lastName}</DialogDescription>
                </DialogHeader>
                 <div className="space-y-2 py-4">
                    <Label htmlFor="amount">المبلغ المراد إضافته (بالجنيه)</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min="1" disabled={isSaving} className="rounded-xl" />
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="rounded-xl">إلغاء</Button>
                    <Button onClick={handleAddBalance} disabled={isSaving || amount <= 0} className="rounded-xl">
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        تأكيد الشحن
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UserRow({ user: student }: { user: Student }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isBanConfirmOpen, setIsBanConfirmOpen] = React.useState(false);
    const [isBanStatusUpdating, setIsBanStatusUpdating] = React.useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    const handleToggleBanStudent = async () => {
        if (!firestore || !student) return;
        setIsBanStatusUpdating(true);
        const newBanStatus = !student.isBanned;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'users', student.id), { isBanned: newBanStatus });
            toast({ title: `تم ${newBanStatus ? 'حظر' : 'تفعيل'} الطالب بنجاح` });
            setIsBanConfirmOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل التحديث' });
        } finally {
            setIsBanStatusUpdating(false);
        }
    };

    const handleDeleteStudent = async () => {
        if (!firestore || !student) return;
        setIsDeleting(true);
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
            toast({ title: 'تم الحذف بنجاح' });
            setIsDeleteConfirmOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'فشل الحذف' });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <>
        <TableRow className={cn("transition-colors", student.isBanned ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/50')}>
            <TableCell className="text-right">
                <div className="flex items-center gap-3" dir="rtl">
                    <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0 border-2 border-primary/10">
                        <AvatarFallback className="font-bold">{student?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0 text-right">
                        <span className="font-bold flex items-center justify-start gap-2 whitespace-nowrap text-sm md:text-base">
                          {student?.firstName} {student?.lastName}
                          {student.isBanned && <ShieldOff className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        </span>
                        <div className="text-[10px] md:text-xs text-muted-foreground break-all opacity-70">{student?.email}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-bold text-xs md:text-sm">{student.grade ? gradeMap[student.grade] : '-'}</TableCell>
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
            <TableCell className="text-center px-2">
                <div className="flex justify-center gap-1.5 md:gap-2">
                    <AddBalanceDialog student={student} />
                    <WithdrawBalanceDialog student={student} />
                    <Button variant={student.isBanned ? 'default' : 'destructive'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsBanConfirmOpen(true)} title={student.isBanned ? 'إلغاء حظر' : 'حظر'}>
                        {student.isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsDeleteConfirmOpen(true)} title="حذف"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </TableCell>
        </TableRow>

        <AlertDialog open={isBanConfirmOpen} onOpenChange={setIsBanConfirmOpen}>
            <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-right">تأكيد الإجراء</AlertDialogTitle>
                <AlertDialogDescription className="text-right font-medium">سيؤدي هذا إلى {student.isBanned ? 'رفع الحظر عن' : 'حظر'} الطالب {student.firstName}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={isBanStatusUpdating} className="rounded-xl">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleBanStudent} className={cn("rounded-xl", !student.isBanned && "bg-destructive")} disabled={isBanStatusUpdating}>تأكيد</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive text-right">حذف نهائي للملف</AlertDialogTitle>
                <AlertDialogDescription className="text-right font-medium">أنت على وشك حذف الطالب {student.firstName} وكافة سجلاته بشكل نهائي. لا يمكن التراجع عن هذا الإجراء!</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={isDeleting} className="rounded-xl">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive rounded-xl" disabled={isDeleting}>حذف نهائي</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}


export default function AdminStudentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = React.useState('');
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
        
        // نظام البحث الذكي بالاسم الكامل
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
                    <TableHead className="min-w-[220px] text-right font-bold">المستخدم</TableHead>
                    <TableHead className="w-[10%] text-right font-bold">الصف</TableHead>
                    <TableHead className="w-[10%] text-right font-bold">الرصيد</TableHead>
                    <TableHead className="w-[15%] text-right font-bold">آخر ظهور</TableHead>
                    <TableHead className="text-center w-[20%] font-bold">الإجراءات</TableHead>
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
