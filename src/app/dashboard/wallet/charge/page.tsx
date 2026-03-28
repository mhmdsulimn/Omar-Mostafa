'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import type { Student, AppSettings } from '@/lib/data';
import { doc, collection } from 'firebase/firestore';
import { Copy, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function ChargeWalletPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [copied, setCopied] = React.useState(false);
  
  // Form state
  const [senderNumber, setSenderNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);
  
  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsDocRef);


  const isLoading = isUserLoading || isStudentDataLoading || isLoadingSettings;

  const vodafoneCashNumber = appSettings?.vodafoneCashNumber || '01090404090';

  const handleCopy = () => {
    navigator.clipboard.writeText(vodafoneCashNumber).then(() => {
      setCopied(true);
      toast({
        title: 'تم النسخ!',
        description: 'تم نسخ رقم فودافون كاش بنجاح.',
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !studentData) return;
    
    if (senderNumber.length !== 11) {
        toast({ variant: 'destructive', title: 'رقم هاتف غير صحيح', description: 'يرجى التأكد من إدخال رقم هاتف مكون من 11 رقمًا.' });
        return;
    }
    if (!amount || Number(amount) <= 0) {
        toast({ variant: 'destructive', title: 'مبلغ غير صحيح', description: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
        return;
    }
    
    setIsSubmitting(true);
    
    const depositRequestData = {
        studentId: user.uid,
        studentName: `${studentData.firstName} ${studentData.lastName}`,
        amount: Number(amount),
        senderPhoneNumber: senderNumber,
        status: 'pending' as const,
        requestDate: new Date().toISOString(),
    };
    
    try {
        const depositRequestsColRef = collection(firestore, 'users', user.uid, 'depositRequests');
        await addDocumentNonBlocking(depositRequestsColRef, depositRequestData);
        
        toast({
            title: 'تم إرسال طلبك بنجاح',
            description: 'سيتم مراجعة طلبك وإضافة الرصيد إلى محفظتك قريباً.',
        });
        
        setSenderNumber('');
        setAmount('');
        router.push('/dashboard/wallet');
    } catch (error) {
        toast({ variant: 'destructive', title: 'فشل إرسال الطلب', description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
    } finally {
        setIsSubmitting(false);
    }
}

  const handleSenderNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 11) {
        setSenderNumber(numericValue);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
          <LoadingAnimation size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span>الرجوع</span>
            </Button>
            <h1 className="text-lg font-semibold md:text-2xl">شحن الرصيد</h1>
        </div>

        <div className="grid gap-8">
            {/* Step 1 Card */}
            <Card>
                <CardHeader>
                    <CardTitle>الخطوة 1: تحويل المبلغ</CardTitle>
                    <CardDescription>
                        قم بتحويل المبلغ الذي تريده إلى رقم فودافون كاش التالي.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 my-2">
                        <span className="font-mono text-xl flex-1 text-center" dir="ltr">{vodafoneCashNumber}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={handleCopy} disabled={isLoadingSettings}>
                            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2 Card */}
            <Card>
                <form onSubmit={handleSubmitRequest}>
                    <CardHeader>
                        <CardTitle>الخطوة 2: تأكيد التحويل</CardTitle>
                        <CardDescription>
                            املأ البيانات التالية بعد إتمام عملية التحويل لإرسال طلبك.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="senderNumber">الرقم الذي تم التحويل منه</Label>
                            <Input id="senderNumber" type="tel" value={senderNumber} onChange={handleSenderNumberChange} disabled={isSubmitting} placeholder="01xxxxxxxxx" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ الذي تم تحويله (بالجنيه)</Label>
                            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSubmitting} placeholder="50" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4 items-stretch">
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>تحذير هام</AlertTitle>
                            <AlertDescription>
                                تأكد من إدخال البيانات بشكل صحيح لضمان وصول الرصيد. احتفظ بصورة من إيصال التحويل كإثبات. إذا لم يصل المبلغ المشحون خلال 24 ساعة، يرجى التواصل مع الدعم الفني وإرسال صورة إثبات التحويل.
                            </AlertDescription>
                        </Alert>
                        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting || senderNumber.length !== 11 || !amount || Number(amount) <= 0}>
                            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'جارِ الإرسال...' : 'تأكيد وإرسال الطلب'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
      </div>
    </div>
  );
}
