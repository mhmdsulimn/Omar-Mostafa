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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError, addDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, collection, where, documentId, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { DepositRequest, Student } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Input } from '@/components/ui/input';
import { toArabicDigits, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Search, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingAnimation } from '@/components/ui/loading-animation';


function ApproveRequestDialog({
    isOpen,
    onOpenChange,
    onConfirm,
    request,
    isProcessing,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (amount: number) => void;
    request: DepositRequest;
    isProcessing: boolean;
}) {
    const [amount, setAmount] = React.useState(request.amount);

    React.useEffect(() => {
        if (isOpen) {
          setAmount(request.amount);
        }
    }, [request.amount, isOpen]);

    const handleConfirm = () => {
        onConfirm(amount);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>قبول طلب الشحن</DialogTitle>
                    <DialogDescription>
                        مراجعة وتأكيد المبلغ المراد شحنه للطالب <span className="font-bold">{request.studentName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="amount">المبلغ (بالجنيه)</Label>
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        disabled={isProcessing}
                    />
                    <p className="text-sm text-muted-foreground mt-2">المبلغ المطلوب في الأصل: {request.amount} جنيه</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>إلغاء</Button>
                    <Button onClick={handleConfirm} disabled={isProcessing || amount <= 0}>
                        {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'تأكيد وشحن الرصيد'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RequestRow({ request }: { request: DepositRequest & { studentEmail: string } }) {
    const { toast } = useToast();
    const { user: adminUser } = useUser();
    const firestore = useFirestore();
    const [isProcessing, setIsProcessing] = React.useState< 'approving' | 'rejecting' | 'deleting' | null>(null);
    const [rejectionReason, setRejectionReason] = React.useState('');
    const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false);
    const [isReasonDialogOpen, setIsReasonDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    const handleApprove = async (approvedAmount: number) => {
        if (!firestore || !adminUser) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم المصادقة بشكل صحيح.' });
            return;
        }

        setIsProcessing('approving');
        const requestRef = doc(firestore, 'users', request.studentId, 'depositRequests', request.id);
        const studentRef = doc(firestore, 'users', request.studentId);
        
        try {
            const requestDoc = await getDoc(requestRef);
            if (!requestDoc.exists() || requestDoc.data()?.status !== 'pending') {
                throw new Error('لا يمكن قبول هذا الطلب لأنه لم يعد في حالة الانتظار.');
            }
            
            const studentDoc = await getDoc(studentRef);
             if (!studentDoc.exists()) {
                throw new Error("لم يتم العثور على حساب الطالب.");
            }
            const studentData = studentDoc.data() as Student;
            const currentBalance = studentData.balance || 0;
            const newBalance = currentBalance + approvedAmount;
            await updateDoc(studentRef, { balance: newBalance });

             await updateDoc(requestRef, {
                status: 'approved',
                reviewDate: new Date().toISOString(),
                reviewerId: adminUser.uid,
                approvedAmount: approvedAmount,
            });
            
            const notificationsColRef = collection(firestore, 'users', request.studentId, 'notifications');
            const notificationMessage = `تم قبول طلب الشحن الخاص بك. تم إضافة ${approvedAmount} جنيه إلى رصيدك.`;
            await addDocumentNonBlocking(notificationsColRef, {
                message: notificationMessage,
                createdAt: new Date().toISOString(),
                isRead: false,
                type: 'wallet',
                link: '/dashboard/wallet'
            });

            toast({ title: 'تم القبول', description: `تم قبول الطلب وشحن الرصيد بمبلغ ${approvedAmount} جنيه.` });
        } catch (error: any) {
            console.error('Error approving deposit request:', error);
             const permissionError = new FirestorePermissionError({
                path: `users/${request.studentId} or subcollections`,
                operation: 'write',
                requestResourceData: { 
                    context: 'Approving deposit request',
                    error: error.message
                },
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsProcessing(null);
            setIsApproveDialogOpen(false);
        }
    }


    const handleReject = async () => {
        if (!firestore || !adminUser) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم المصادقة بشكل صحيح.' });
            return;
        }
        if (!rejectionReason) {
            toast({ variant: 'destructive', title: 'مطلوب سبب الرفض' });
            return;
        }
        setIsProcessing('rejecting');
        const requestRef = doc(firestore, 'users', request.studentId, 'depositRequests', request.id);

        try {
             const requestDoc = await getDoc(requestRef);
            if (!requestDoc.exists() || requestDoc.data()?.status !== 'pending') {
                throw new Error('لا يمكن رفض هذا الطلب لأنه لم يعد في حالة الانتظار.');
            }

            await updateDoc(requestRef, {
                status: 'rejected',
                reviewDate: new Date().toISOString(),
                reviewerId: adminUser.uid,
                reviewerNotes: rejectionReason,
            });

            const notificationsColRef = collection(firestore, 'users', request.studentId, 'notifications');
            const notificationMessage = `تم رفض طلب الشحن الخاص بك. السبب: ${rejectionReason}`;
            await addDocumentNonBlocking(notificationsColRef, {
                message: notificationMessage,
                createdAt: new Date().toISOString(),
                isRead: false,
                type: 'wallet',
                link: '/dashboard/wallet/charge'
            });

            toast({ title: 'تم الرفض', description: 'تم رفض الطلب بنجاح.' });

        } catch (error: any) {
            console.error('Error rejecting deposit request:', error);
            const permissionError = new FirestorePermissionError({
                path: `users/${request.studentId}/depositRequests/${request.id}`,
                operation: 'write',
                requestResourceData: { 
                    context: 'Rejecting deposit request',
                    reason: rejectionReason,
                },
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsProcessing(null);
            setIsRejectDialogOpen(false);
            setRejectionReason('');
        }
    }

    const handleDelete = async () => {
        if (!firestore) return;
        setIsProcessing('deleting');
        const requestRef = doc(firestore, 'users', request.studentId, 'depositRequests', request.id);
        try {
            await deleteDoc(requestRef);
            toast({ title: 'تم الحذف', description: 'تم حذف طلب الدفع بنجاح.' });
        } catch (error) {
            console.error('Error deleting deposit request:', error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حذف طلب الدفع.' });
        } finally {
            setIsProcessing(null);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <TableRow>
                <TableCell className="p-3 md:p-4">
                    <div className="font-medium text-xs md:sm">{request.studentName}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">{request.studentEmail}</div>
                </TableCell>
                <TableCell className="font-mono text-center text-xs md:text-sm" dir="ltr">{request.amount.toFixed(0)}</TableCell>
                <TableCell className="text-center text-xs md:text-sm">{request.senderPhoneNumber}</TableCell>
                <TableCell className="text-center">
                    <div className="flex flex-col text-[10px] md:text-xs">
                        <span>{toArabicDigits(format(new Date(request.requestDate), 'd MMM yyyy', { locale: arSA }))}</span>
                        <span className="text-muted-foreground">{toArabicDigits(format(new Date(request.requestDate), 'h:mm a', { locale: arSA }))}</span>
                    </div>
                </TableCell>
                
                <TableCell className="text-center px-2">
                    {request.status === 'pending' ? (
                        <div className='flex justify-center gap-1.5'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        onClick={() => setIsApproveDialogOpen(true)}
                                        disabled={!!isProcessing}
                                        className="bg-green-500 hover:bg-green-600 text-white h-7 w-7 md:h-8 md:w-8"
                                    >
                                        <Check className='h-3.5 w-3.5 md:h-4 md:w-4' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>قبول</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        size="icon" 
                                        variant="destructive" 
                                        onClick={() => setIsRejectDialogOpen(true)}
                                        disabled={!!isProcessing} 
                                        className="h-7 w-7 md:h-8 md:w-8"
                                    >
                                        <X className='h-3.5 w-3.5 md:h-4 md:w-4' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>رفض</p></TooltipContent>
                            </Tooltip>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center gap-1.5">
                            {request.reviewerNotes ? (
                                <Badge variant={'destructive'} className='cursor-pointer text-[10px] md:text-xs py-0 px-1.5' onClick={() => setIsReasonDialogOpen(true)}>
                                    مرفوض
                                </Badge>
                            ) : (
                                <Badge variant={'default'} className="cursor-help text-[10px] md:text-xs py-0 px-1.5">
                                    مقبول
                                </Badge>
                            )}
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        disabled={!!isProcessing}
                                        className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>حذف</p></TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </TableCell>
            </TableRow>

            <ApproveRequestDialog
                isOpen={isApproveDialogOpen}
                onOpenChange={setIsApproveDialogOpen}
                onConfirm={handleApprove}
                request={request}
                isProcessing={isProcessing === 'approving'}
            />

            <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من رفض الطلب؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لن يتم إضافة الرصيد إلى حساب الطالب. يرجى ذكر سبب الرفض.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='space-y-2 py-2'>
                        <Label htmlFor='rejection-reason'>سبب الرفض</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder='مثال: المبلغ المحول لا يتطابق مع الطلب.'
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject} disabled={!rejectionReason || isProcessing === 'rejecting'} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isProcessing === 'rejecting' && <Loader2 className='h-4 w-4 animate-spin ml-2' />}
                                تأكيد الرفض
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>سبب رفض الطلب</DialogTitle>
                        <DialogDescription>
                            سبب رفض طلب شحن الرصيد للطالب: {request.studentName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="rounded-md border bg-muted p-4 text-sm">{request.reviewerNotes || 'لا يوجد سبب محدد.'}</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsReasonDialogOpen(false)}>إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف الطلب بشكل دائم.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing === 'deleting'}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing === 'deleting'} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                           {isProcessing === 'deleting' && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                           حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default function AdminPaymentsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [cleanupTriggered, setCleanupTriggered] = React.useState(false);

    // جلب طلبات الدفع - مع حماية من أخطاء الأذونات
    const allDepositsQuery = useMemoFirebase(
      () => (firestore && user ? query(collectionGroup(firestore, 'depositRequests')) : null),
      [firestore, user, user?.uid]
    );
    const { data: allRequests, isLoading: isLoadingRequests } = useCollection<DepositRequest>(allDepositsQuery, { ignorePermissionErrors: true });
    
    const studentIds = React.useMemo(() => {
        if (!allRequests) return [];
        return [...new Set(allRequests.map(req => req.studentId))];
    }, [allRequests]);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user || studentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
    }, [firestore, user, studentIds]);
    const { data: usersForRequests, isLoading: isLoadingUsers } = useCollection<Student>(usersQuery, { ignorePermissionErrors: true });

    const isLoading = isLoadingRequests || (studentIds.length > 0 && isLoadingUsers);

    const processedRequests = React.useMemo(() => {
        if (!allRequests || (studentIds.length > 0 && !usersForRequests)) {
          return [];
        }

        const usersMap = new Map(usersForRequests?.map(user => [user.id, user]));

        return allRequests
          .map(req => {
            const user = usersMap.get(req.studentId);
            return {
              ...req,
              studentEmail: user?.email || 'غير متوفر',
              studentName: user ? `${user.firstName} ${user.lastName}`.trim() : req.studentName,
            };
          })
          .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [allRequests, usersForRequests, studentIds]);
    
    React.useEffect(() => {
        if (isLoading || cleanupTriggered || !firestore || processedRequests.length === 0) return;

        const oldRequests = processedRequests.filter(req => {
            if (req.status === 'pending' || !req.reviewDate) return false;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const reviewDate = new Date(req.reviewDate);
            return reviewDate < sevenDaysAgo;
        });

        if (oldRequests.length > 0) {
            setCleanupTriggered(true);
            const batch = writeBatch(firestore);
            oldRequests.forEach(req => {
                const requestRef = doc(firestore, 'users', req.studentId, 'depositRequests', req.id);
                batch.delete(requestRef);
            });

            batch.commit().then(() => {
                toast({ title: 'تنظيف تلقائي', description: `تم حذف ${oldRequests.length} من الطلبات القديمة.` });
            }).catch(err => {
                setCleanupTriggered(false);
            });
        }
    }, [processedRequests, isLoading, cleanupTriggered, firestore, toast]);


    const filteredRequests = React.useMemo(() => {
        if (!searchTerm) {
          return processedRequests;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return processedRequests.filter(req =>
          req.studentName.toLowerCase().includes(lowercasedFilter) ||
          req.senderPhoneNumber.includes(lowercasedFilter) ||
          req.studentEmail.toLowerCase().includes(lowercasedFilter)
        );
      }, [processedRequests, searchTerm]);
    
    const pendingRequests = React.useMemo(() => filteredRequests.filter(r => r.status === 'pending'), [filteredRequests]);
    const approvedRequests = React.useMemo(() => filteredRequests.filter(r => r.status === 'approved'), [filteredRequests]);
    const rejectedRequests = React.useMemo(() => filteredRequests.filter(r => r.status === 'rejected'), [filteredRequests]);

    const renderTable = (requests: (DepositRequest & { studentEmail: string })[]) => {
        if (requests.length === 0) {
            return (
                 <div className="text-center py-10 text-muted-foreground text-sm">
                    لا توجد طلبات في هذه الفئة.
                </div>
            )
        }
        
        return (
            <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-[500px] md:min-w-full">
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="px-3 md:px-4">الطالب</TableHead>
                            <TableHead className="text-center px-2">المبلغ (جنيه)</TableHead>
                            <TableHead className="text-center px-2">رقم المرسل</TableHead>
                            <TableHead className="text-center px-2">التاريخ</TableHead>
                            <TableHead className="text-center px-2">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {requests.map(req => <RequestRow key={req.id} request={req} />)}
                     </TableBody>
                </Table>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
                <LoadingAnimation size="md" />
            </div>
        );
    }
    
    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">طلبات الدفع</h1>
            </div>
            <Card className="border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
                <CardHeader className="px-4 md:px-6 pt-6 pb-0">
                    <CardTitle className="text-lg md:text-xl">مراجعة طلبات شحن الرصيد</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                       مراجعة طلبات الدفع. يتم حذف الطلبات المكتملة تلقائياً بعد 7 أيام.
                    </CardDescription>
                     <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="ابحث بالاسم أو الهاتف..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pr-9"
                            />
                        </div>
                     </div>
                </CardHeader>
                <CardContent className="px-2 md:px-6 pb-6 pt-6">
                    <Tabs defaultValue="pending" className="w-full" dir="rtl">
                        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl mb-4">
                            <TabsTrigger value="pending" className="py-2.5 text-[10px] sm:text-xs md:text-sm rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                <span className="hidden xs:inline">قيد الانتظار</span>
                                <span className="xs:hidden">انتظار</span>
                                <Badge variant="secondary" className="mr-1.5 h-4 px-1 text-[9px] pointer-events-none">{pendingRequests.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="py-2.5 text-[10px] sm:text-xs md:text-sm rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">مقبولة</TabsTrigger>
                            <TabsTrigger value="rejected" className="py-2.5 text-[10px] sm:text-xs md:text-sm rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">مرفوضة</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-0 focus-visible:outline-none">{renderTable(pendingRequests)}</TabsContent>
                        <TabsContent value="approved" className="mt-0 focus-visible:outline-none">{renderTable(approvedRequests)}</TabsContent>
                        <TabsContent value="rejected" className="mt-0 focus-visible:outline-none">{renderTable(rejectedRequests)}</TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
