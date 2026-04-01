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

    // State for fixed amount
    const [fixedAmount, setFixedAmount] = React.useState(10);
    // State for random amount
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
            } else { // random
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
            console.error("Error in bulk balance update:", error);
            toast({ variant: 'destructive', title: 'فشل شحن الرصيد', description: 'حدث خطأ أثناء تحديث أرصدة الطلاب.' });
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
            <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>شحن رصيد لجميع الطلاب</DialogTitle>
                    <DialogDescription>
                        إضافة رصيد إلى محفظة جميع الطلاب ({students.length} طالب) في القائمة الحالية.
                    </DialogDescription>
                </DialogHeader>
                 <Tabs value={tab} onValueChange={setTab} className="w-full" dir="rtl">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="fixed">مبلغ ثابت</TabsTrigger>
                        <TabsTrigger value="random">مبلغ عشوائي</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fixed">
                        <Card className="shadow-none border-none bg-transparent">
                            <CardHeader className="px-0">
                                <CardTitle className="text-base">مبلغ ثابت</CardTitle>
                                <CardDescription>إضافة نفس المبلغ لجميع الطلاب.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 px-0 pb-0">
                                <Label htmlFor="fixedAmount">المبلغ المراد إضافته (بالجنيه)</Label>
                                <Input 
                                    id="fixedAmount" 
                                    type="number"
                                    value={fixedAmount}
                                    onChange={(e) => setFixedAmount(Number(e.target.value))}
                                    min="1"
                                    disabled={isSaving}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="random">
                         <Card className="shadow-none border-none bg-transparent">
                            <CardHeader className="px-0">
                                <CardTitle className="text-base">مبلغ عشوائي</CardTitle>
                                <CardDescription>إضافة مبلغ عشوائي لكل طالب ضمن النطاق المحدد.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 px-0 pb-0">
                                <div className="space-y-2">
                                    <Label htmlFor="minAmount">الحد الأدنى للمبلغ</Label>
                                    <Input 
                                        id="minAmount" 
                                        type="number"
                                        value={minAmount}
                                        onChange={(e) => setMinAmount(Number(e.target.value))}
                                        min="1"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxAmount">الحد الأقصى للمبلغ</Label>
                                    <Input 
                                        id="maxAmount" 
                                        type="number"
                                        value={maxAmount}
                                        onChange={(e) => setMaxAmount(Number(e.target.value))}
                                        min={minAmount}
                                        disabled={isSaving}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>إلغاء</Button>
                    <Button onClick={handleBulkAddBalance} disabled={isSaving}>
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

    const currentBalance = student.balance || 0;

    const handleWithdrawBalance = async () => {
        if (!firestore || !student || amount <= 0) {
            toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
            return;
        }

        setIsSaving(true);
        const userDocRef = doc(firestore, 'users', student.id);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                 const studentDoc = await transaction.get(userDocRef);
                if (!studentDoc.exists()) {
                    throw new Error("لم يتم العثور على حساب الطالب.");
                }

                const studentData = studentDoc.data();
                const currentBalanceInDb = studentData.balance || 0;

                if (amount > currentBalanceInDb) {
                    throw new Error("لا يمكن سحب مبلغ أكبر من الرصيد الحالي.");
                }
                
                const newBalance = currentBalanceInDb - amount;
                
                // Update balance
                transaction.update(userDocRef, { balance: newBalance });

                // Create notification
                const notificationRef = doc(collection(firestore, 'users', student.id, 'notifications'));
                const notificationMessage = `تم سحب مبلغ ${amount} جنيه من رصيدك بواسطة الإدارة.`;
                transaction.set(notificationRef, {
                    message: notificationMessage,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    type: 'wallet',
                    link: '/dashboard/wallet'
                });
            });

            toast({
                title: 'تم سحب الرصيد بنجاح',
                description: `تم سحب ${amount} جنيه من رصيد ${student.firstName}.`,
            });
            setIsOpen(false);
            setAmount(0);
        } catch (error: any) {
            console.error("Error withdrawing balance:", error);
            toast({ variant: 'destructive', title: 'فشل سحب الرصيد', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" title="سحب رصيد من الطالب">
                    <Minus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>سحب رصيد من الطالب</DialogTitle>
                    <DialogDescription>
                        سحب رصيد من محفظة الطالب: <span className="font-bold">{student.firstName} {student.lastName}</span>.
                        <br/>
                        الرصيد الحالي: <span className="font-bold">{currentBalance}</span> جنيه.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-2 py-4">
                    <Label htmlFor="amount">المبلغ المراد سحبه (بالجنيه)</Label>
                    <Input 
                        id="amount" 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min="1"
                        max={currentBalance}
                        disabled={isSaving}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>إلغاء</Button>
                    <Button onClick={handleWithdrawBalance} disabled={isSaving || amount <= 0 || amount > currentBalance} variant="destructive">
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
        if (!firestore || !student || amount <= 0) {
            toast({ variant: 'destructive', title: 'مبلغ غير صالح', description: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
            return;
        }

        setIsSaving(true);
        const userDocRef = doc(firestore, 'users', student.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const studentDoc = await transaction.get(userDocRef);
                if (!studentDoc.exists()) {
                    throw new Error("لم يتم العثور على حساب الطالب.");
                }
                
                const studentData = studentDoc.data();
                const currentBalance = studentData.balance || 0;
                const newBalance = currentBalance + amount;

                // Update student balance
                transaction.update(userDocRef, { balance: newBalance });
                
                // Create notification
                const notificationRef = doc(collection(firestore, 'users', student.id, 'notifications'));
                const notificationMessage = `تمت إضافة ${amount} جنيه إلى رصيدك كهدية من الإدارة.`;
                transaction.set(notificationRef, {
                    message: notificationMessage,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    type: 'wallet',
                    link: '/dashboard/wallet'
                });
            });

            toast({
                title: 'تم شحن الرصيد بنجاح',
                description: `تمت إضافة ${amount} جنيه إلى رصيد ${student.firstName}.`,
            });
            setIsOpen(false);
            setAmount(0);
        } catch (error: any) {
            console.error("Error adding balance:", error);
            toast({ variant: 'destructive', title: 'فشل شحن الرصيد', description: error.message || 'An unknown error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" title="شحن رصيد الطالب">
                    <DollarSign className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>شحن رصيد الطالب</DialogTitle>
                    <DialogDescription>
                        إضافة رصيد إلى محفظة الطالب: <span className="font-bold">{student.firstName} {student.lastName}</span>.
                        <br/>
                        الرصيد الحالي: <span className="font-bold">{student.balance || 0}</span> جنيه.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-2 py-4">
                    <Label htmlFor="amount">المبلغ المراد إضافته (بالجنيه)</Label>
                    <Input 
                        id="amount" 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        min="1"
                        disabled={isSaving}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>إلغاء</Button>
                    <Button onClick={handleAddBalance} disabled={isSaving || amount <= 0}>
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
            const userDocRef = doc(firestore, 'users', student.id);
            await updateDocumentNonBlocking(userDocRef, { isBanned: newBanStatus });

            toast({
                title: `تم ${newBanStatus ? 'حظر' : 'رفع الحظر عن'} الطالب بنجاح`,
                description: `${student.firstName} ${student.lastName} الآن ${newBanStatus ? 'محظور' : 'نشط'}.`,
            });
            setIsBanConfirmOpen(false);

        } catch (error: any) {
            console.error("Error updating student ban status:", error);
            toast({
                variant: 'destructive',
                title: 'فشل تحديث حالة الطالب',
                description: 'حدث خطأ أثناء محاولة تحديث البيانات في قاعدة البيانات.',
            });
        } finally {
            setIsBanStatusUpdating(false);
        }
    };

    const handleDeleteStudent = async () => {
        if (!firestore || !student) return;
        
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            
            // 1. Fetch subcollections
            const examsSnap = await getDocs(collection(firestore, 'users', student.id, 'studentExams'));
            const coursesSnap = await getDocs(collection(firestore, 'users', student.id, 'studentCourses'));
            const depositsSnap = await getDocs(collection(firestore, 'users', student.id, 'depositRequests'));
            const notifsSnap = await getDocs(collection(firestore, 'users', student.id, 'notifications'));

            // 2. Add subcollection documents to batch deletion
            examsSnap.docs.forEach(d => batch.delete(d.ref));
            depositsSnap.docs.forEach(d => batch.delete(d.ref));
            notifsSnap.docs.forEach(d => batch.delete(d.ref));
            
            for (const courseDoc of coursesSnap.docs) {
                // Fetch and delete progress subcollection for each course
                const progressSnap = await getDocs(collection(courseDoc.ref, 'progress'));
                progressSnap.docs.forEach(p => batch.delete(p.ref));
                batch.delete(courseDoc.ref);
            }

            // 3. Delete the main student profile document
            batch.delete(doc(firestore, 'users', student.id));

            // 4. Commit the batch
            await batch.commit();

            toast({
                title: 'تم الحذف بنجاح',
                description: `تم حذف الطالب ${student.firstName} وجميع بياناته فوراً وبشكل نهائي.`,
            });
            setIsDeleteConfirmOpen(false);
        } catch (error: any) {
            console.error("Error deleting student:", error);
            toast({
                variant: 'destructive',
                title: 'فشل الحذف',
                description: 'حدث خطأ أثناء محاولة مسح بيانات الطالب من قاعدة البيانات.',
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <>
        <TableRow className={student.isBanned ? 'bg-destructive/10' : ''}>
            <TableCell>
                <div className="flex items-center gap-2 md:gap-3">
                    <Avatar className="h-8 w-8 md:h-9 md:w-9 shrink-0">
                        <AvatarFallback>{student?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium flex items-center gap-1 md:gap-2 whitespace-nowrap">
                          {student?.firstName} {student?.lastName}
                          {student.isBanned && <ShieldOff className="h-3 w-3 md:h-4 md:w-4 text-destructive shrink-0" />}
                        </span>
                        <div className="text-[10px] md:text-xs text-muted-foreground break-all">{student?.email}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">{student.grade ? gradeMap[student.grade] : '-'}</TableCell>
            <TableCell className="font-medium whitespace-nowrap">{student.balance || 0} جنيه</TableCell>
            <TableCell className="text-center px-2">
                <div className="flex justify-center gap-1 md:gap-2">
                    <AddBalanceDialog student={student} />
                    <WithdrawBalanceDialog student={student} />
                    <Button
                        variant={student.isBanned ? 'default' : 'destructive'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsBanConfirmOpen(true)}
                        title={student.isBanned ? 'رفع الحظر عن الطالب' : 'حظر الطالب'}
                    >
                        {student.isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                        <span className="sr-only">{student.isBanned ? 'رفع الحظر' : 'حظر'}</span>
                    </Button>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        title="حذف الطالب"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">حذف</span>
                    </Button>
                </div>
            </TableCell>
        </TableRow>

        {/* Ban Confirmation */}
        <AlertDialog
            open={isBanConfirmOpen}
            onOpenChange={setIsBanConfirmOpen}
        >
            <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
            <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                   سيؤدي هذا إلى {student.isBanned ? 'رفع الحظر عن' : 'حظر'} الطالب 
                   <span className="font-bold"> {student.firstName} {student.lastName}</span>.
                   <br/><br/>
                   {student.isBanned 
                     ? 'سيتمكن الطالب من تسجيل الدخول واستخدام التطبيق مرة أخرى.' 
                     : 'لن يتمكن الطالب من تسجيل الدخول حتى يتم رفع الحظر عنه.'
                   }
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isBanStatusUpdating}>
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleToggleBanStudent}
                  className={student.isBanned ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                  disabled={isBanStatusUpdating}
                >
                 {isBanStatusUpdating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                 تأكيد
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
        >
            <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">حذف الطالب نهائياً</AlertDialogTitle>
                <AlertDialogDescription>
                   أنت على وشك حذف الطالب <span className="font-bold">{student.firstName} {student.lastName}</span> بشكل كامل من المنصة **فوراً**.
                   <br/><br/>
                   <span className="text-destructive font-bold">تنبيه:</span> سيتم مسح كافة سجلات الاختبارات، اشتراكات الكورسات، والرصيد المالي المرتبط بهذا الحساب بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteStudent}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                 {isDeleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                 تأكيد الحذف الفوري
                </AlertDialogAction>
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

  const adminsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'roles_admin') : null),
    [firestore, user]
  );
  const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection<{id: string}>(adminsQuery, { ignorePermissionErrors: true });
  
  const allUsersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user]
  );
  const { data: allUsersData, isLoading: isLoadingStudents } = useCollection<Student>(allUsersQuery, { ignorePermissionErrors: true });
  
  const isLoading = isLoadingStudents || isLoadingAdmins;

  const students = React.useMemo(() => {
    if (isLoading || !allUsersData || !adminRoles) return [];
    
    const adminIds = new Set(adminRoles.map(r => r.id));
    // نستثني المسؤولين من قائمة الطلاب
    return allUsersData.filter(user => !adminIds.has(user.id));
  }, [allUsersData, adminRoles, isLoading]);

  const filteredUsers = React.useMemo(() => {
    if (!students) return [];
    
    const search = searchTerm.toLowerCase().trim();

    return students.filter(student => {
        // البحث بالاسم الكامل (دمج الاسم الأول والأخير)
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
        const email = (student.email || '').toLowerCase();
        
        const searchMatch = !search ||
            fullName.includes(search) ||
            email.includes(search);

        const gradeMatch = gradeFilter === 'all' || student.grade === gradeFilter;

        return searchMatch && gradeMatch;
    }).sort((a,b) => (a.firstName || '').localeCompare(b.firstName || ''));

  }, [searchTerm, gradeFilter, students]);


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">الطلاب</h1>
         <div className="ml-auto flex items-center gap-2">
            <AddBalanceToAllDialog students={filteredUsers} />
        </div>
      </div>
      <Card className="animate-fade-in border-none shadow-none md:border md:shadow-lg">
        <CardHeader className="px-2 md:px-6">
          <CardTitle>قائمة الطلاب</CardTitle>
          <CardDescription>
            إدارة حسابات وأرصدة الطلاب المسجلين.
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ابحث بالاسم بالكامل أو البريد..."
                    className="pr-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select dir="rtl" value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="فلترة بالصف" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">كل الصفوف</SelectItem>
                    <SelectItem value="first_secondary">الأول الثانوي</SelectItem>
                    <SelectItem value="second_secondary">الثاني الثانوي</SelectItem>
                    <SelectItem value="third_secondary">الثالث الثانوي</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                لم يتم العثور على طلاب يطابقون بحثك.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">المستخدم</TableHead>
                    <TableHead className="w-[15%]">الصف</TableHead>
                    <TableHead className="w-[15%]">الرصيد</TableHead>
                    <TableHead className="text-center w-[25%]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
