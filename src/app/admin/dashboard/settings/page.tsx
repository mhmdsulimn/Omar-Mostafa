
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUser, useFirestore, useAuth, setDocumentNonBlocking, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import * as React from 'react';
import { PasswordInput } from '@/components/ui/password-input';
import { doc, onSnapshot, collection, getDocs, writeBatch, query, collectionGroup, deleteDoc } from 'firebase/firestore';
import { Loader2, Sun, Moon, Monitor, AlertTriangle, Trophy, Key } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Student, AppSettings } from '@/lib/data';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';

const DEFAULT_IMGBB_KEY = '3940d136f148755904ab3afd4e73d825';

const colorOptions = [
  { name: 'افتراضي', value: '210 100% 60%', className: 'bg-blue-500' },
  { name: 'زمردي', value: '147 45% 49%', className: 'bg-emerald-600' },
  { name: 'وردي', value: '330 80% 60%', className: 'bg-pink-500' },
  { name: 'برتقالي', value: '27 87% 67%', className: 'bg-orange-500' },
  { name: 'بنفسجي', value: '262 85% 60%', className: 'bg-purple-600' },
  { name: 'أحمر', value: '0 84% 60%', className: 'bg-red-500' },
  { name: 'ذهبي ملكي', value: '45 100% 42%', className: 'bg-[#d4af37]' },
];

function ResetStepDialog({
  title,
  description,
  buttonText,
  resetTask,
  disabled,
}: {
  title: string;
  description: React.ReactNode;
  buttonText: string;
  resetTask: 'resetExams' | 'resetCourses' | 'resetStudents';
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleReset = () => {
    if (!firestore) return;

    setIsResetting(true);
    
    const performReset = async () => {
        try {
            const batch = writeBatch(firestore);
            
            if (resetTask === 'resetExams') {
                const qsSnap = await getDocs(collectionGroup(firestore, 'questions'));
                const seSnap = await getDocs(collectionGroup(firestore, 'studentExams'));
                const eSnap = await getDocs(collection(firestore, 'exams'));
                
                qsSnap.docs.forEach(d => batch.delete(d.ref));
                seSnap.docs.forEach(d => batch.delete(d.ref));
                eSnap.docs.forEach(d => batch.delete(d.ref));
                
                batch.commit().then(() => {
                    toast({ title: 'اكتمل الحذف بنجاح', description: 'تم حذف جميع الاختبارات والأسئلة والنتائج.' });
                    setIsResetting(false);
                    setIsOpen(false);
                }).catch(err => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'exams/questions/studentExams', operation: 'delete' }));
                    setIsResetting(false);
                });
            } 
            else if (resetTask === 'resetCourses') {
                const prSnap = await getDocs(collectionGroup(firestore, 'progress'));
                const scSnap = await getDocs(collectionGroup(firestore, 'studentCourses'));
                const ctSnap = await getDocs(collectionGroup(firestore, 'contents'));
                const lcSnap = await getDocs(collectionGroup(firestore, 'lectures'));
                const cSnap = await getDocs(collection(firestore, 'courses'));
                
                prSnap.docs.forEach(d => batch.delete(d.ref));
                scSnap.docs.forEach(d => batch.delete(d.ref));
                ctSnap.docs.forEach(d => batch.delete(d.ref));
                lcSnap.docs.forEach(d => batch.delete(d.ref));
                cSnap.docs.forEach(d => batch.delete(d.ref));
                
                batch.commit().then(() => {
                    toast({ title: 'اكتمل الحذف بنجاح', description: 'تم حذف جميع الكورسات والمحتويات المرتبطة بها.' });
                    setIsResetting(false);
                    setIsOpen(false);
                }).catch(err => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'courses/lectures/contents', operation: 'delete' }));
                    setIsResetting(false);
                });
            } 
            else if (resetTask === 'resetStudents') {
                const adminsSnap = await getDocs(collection(firestore, 'roles_admin'));
                const adminIds = new Set(adminsSnap.docs.map(d => d.id));

                const drSnap = await getDocs(collectionGroup(firestore, 'depositRequests'));
                const nfSnap = await getDocs(collectionGroup(firestore, 'notifications'));
                const anSnap = await getDocs(collection(firestore, 'announcements'));
                const uSnap = await getDocs(collection(firestore, 'users'));
                
                drSnap.docs.forEach(d => batch.delete(d.ref));
                nfSnap.docs.forEach(d => batch.delete(d.ref));
                anSnap.docs.forEach(d => batch.delete(d.ref));
                
                let count = 0;
                uSnap.docs.forEach(uDoc => {
                    if (!adminIds.has(uDoc.id)) {
                        batch.delete(uDoc.ref);
                        count++;
                    }
                });
                
                batch.commit().then(() => {
                    toast({ title: 'اكتمل الحذف بنجاح', description: `تم حذف ${count} طالب والبيانات العامة المرتبطة بهم.` });
                    setIsResetting(false);
                    setIsOpen(false);
                }).catch(err => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'delete' }));
                    setIsResetting(false);
                });
            }
        } catch (err: any) {
            console.error("Fetch failed during reset:", err);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'collections', operation: 'list' }));
            setIsResetting(false);
        }
    };

    performReset();
  };


  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="flex w-full items-center justify-between rounded-lg border p-4 text-right transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled || isResetting}
        >
          <div className='flex-1'>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">
                  {description}
              </p>
          </div>
          <div className={cn(buttonVariants({ variant: 'destructive' }), "shrink-0 mr-4")}>
            {isResetting ? <Loader2 className="animate-spin h-5 w-5" /> : buttonText}
          </div>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 py-2">
              <div className="flex items-start gap-3 bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="text-sm">
                  {description}
                  <p className="font-bold mt-2">هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه وسيتم مسح البيانات فوراً.</p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isResetting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isResetting ? 'جارِ الحذف...' : 'تأكيد الحذف النهائي'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [primaryColor, setPrimaryColor] = React.useState<string | undefined>(undefined);
  const [supportPhoneNumber, setSupportPhoneNumber] = React.useState('');
  const [isSavingSupport, setIsSavingSupport] = React.useState(false);
  const [vodafoneCashNumber, setVodafoneCashNumber] = React.useState('');
  const [isSavingPayment, setIsSavingPayment] = React.useState(false);
  const [imgbbApiKey, setImgbbApiKey] = React.useState('');
  const [isSavingImgbb, setIsSavingImgbb] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const settingsDocRef = useMemoFirebase(
      () => (firestore && user ? doc(firestore, 'settings', 'global') : null),
      [firestore, user]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsDocRef);
  

  React.useEffect(() => {
    if (userDocRef) {
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Student;
          setPrimaryColor(data.theme?.primaryColor);
        }
      });
      return () => unsub();
    }
  }, [userDocRef]);

  React.useEffect(() => {
    if (appSettings) {
      setSupportPhoneNumber(appSettings.supportPhoneNumber || '');
      setVodafoneCashNumber(appSettings.vodafoneCashNumber || '');
      // تزويد الصندوق بالمفتاح الحالي (المحفوظ أو الافتراضي) ليراه المستخدم
      setImgbbApiKey(appSettings.imgbbApiKey || DEFAULT_IMGBB_KEY);
    }
  }, [appSettings]);


  const signInProvider = user?.providerData[0]?.providerId;
  const isGoogleSignIn = signInProvider === GoogleAuthProvider.PROVIDER_ID;
  const isPasswordSignIn = signInProvider === EmailAuthProvider.PROVIDER_ID;


  const handleColorChange = (colorValue: string) => {
    if (!userDocRef) return;
    const themeData = { theme: { primaryColor: colorValue } };
    setDocumentNonBlocking(userDocRef, themeData, { merge: true })
      .then(() => {
        toast({
          title: 'تم تحديث المظهر',
          description: 'تم حفظ لونك المفضل بنجاح.',
        });
      });
  };

  const handleMaintenanceModeChange = (checked: boolean) => {
    if (!settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, { isMaintenanceMode: checked }, { merge: true })
      .then(() => {
        toast({
            title: `تم ${checked ? 'تفعيل' : 'إلغاء تفعيل'} وضع الصيانة.`,
            description: checked ? 'سيرى الطلاب صفحة صيانة حالياً.' : 'الموقع متاح الآن للطلاب.',
        });
      });
  };

  const handleLeaderboardToggle = (checked: boolean) => {
    if (!settingsDocRef) return;
    setDocumentNonBlocking(settingsDocRef, { isLeaderboardEnabled: checked }, { merge: true })
      .then(() => {
        toast({
            title: `تم ${checked ? 'إظهار' : 'إخفاء'} لوحة الصدارة.`,
            description: `لوحة الصدارة الآن ${checked ? 'ظاهرة' : 'مخفية'} للطلاب.`,
        });
      });
  };

  const handleSaveSupportSettings = () => {
    if (!settingsDocRef) return;
    setIsSavingSupport(true);
    setDocumentNonBlocking(settingsDocRef, { supportPhoneNumber }, { merge: true })
      .then(() => {
        toast({
          title: 'تم حفظ رقم الدعم',
          description: 'تم تحديث رقم هاتف الدعم الفني بنجاح.',
        });
      })
      .finally(() => setIsSavingSupport(false));
  };

  const handleSavePaymentSettings = () => {
    if (!settingsDocRef) return;
    setIsSavingPayment(true);
    setDocumentNonBlocking(settingsDocRef, { vodafoneCashNumber }, { merge: true })
      .then(() => {
        toast({
          title: 'تم حفظ رقم الدفع',
          description: 'تم تحديث رقم فودافون كاش بنجاح.',
        });
      })
      .finally(() => setIsSavingPayment(false));
  };

  const handleSaveImgbbSettings = () => {
    if (!settingsDocRef) return;
    setIsSavingImgbb(true);
    setDocumentNonBlocking(settingsDocRef, { imgbbApiKey }, { merge: true })
      .then(() => {
        toast({
          title: 'تم حفظ مفتاح ImgBB',
          description: 'تم تحديث توكن رفع الصور بنجاح. سيتم استخدامه في عمليات الرفع القادمة.',
        });
      })
      .finally(() => setIsSavingImgbb(false));
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) return;

    setIsLoading(true);
    try {
      if (isGoogleSignIn) {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(user, provider);
      } else if (isPasswordSignIn) {
          if (!password) {
               toast({ variant: 'destructive', title: 'خطأ', description: 'كلمة المرور مطلوبة لحذف الحساب.'});
              setIsLoading(false);
              return;
          }
          if (!user.email) throw new Error("User email is not available for re-authentication.");
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);
      }
      
      const studentsToDeleteRef = doc(firestore, 'students_to_delete', user.uid);
      await setDocumentNonBlocking(studentsToDeleteRef, { requestedBy: user.uid, requestedAt: new Date().toISOString() }, {});
      
      await deleteUser(user);

      toast({
        title: 'تم حذف الحساب',
        description: 'تم حذف حسابك وبياناتك بنجاح. سنقوم بإعادة توجيهك.',
      });
      setIsDialogOpen(false);
      window.location.href = '/login'; 

    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        variant: 'destructive',
        title: 'فشل حذف الحساب',
        description: error.code === 'auth/wrong-password'
          ? 'كلمة المرور التي أدخلتها غير صحيحة.'
          : 'فشلت عملية إعادة المصادقة. يرجى المحاولة مرة أخرى.',
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  const getReauthDescription = () => {
    if (isGoogleSignIn) {
        return 'هذا الإجراء لا يمكن التراجع عنه. لتأكيد الحذف، سيتم إعادة توجيهك إلى Google لإعادة المصادقة.';
    }
    return 'هذا الإجراء لا يمكن التراجع عنه. لتأكيد الحذف، يرجى إدخل كلمة المرور الخاصة بك.';
  }

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">الإعدادات</h1>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>تخصيص المظهر</CardTitle>
          <CardDescription>
            اختر اللون الرئيسي الذي تفضله للموقع.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {colorOptions.map((color) => (
              <div key={color.name} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={cn(
                    'h-12 w-12 rounded-full border-2 transition-all',
                    color.className,
                    (primaryColor || colorOptions[0].value) === color.value 
                      ? 'border-primary ring-2 ring-offset-2 ring-primary ring-offset-background' 
                      : 'border-transparent'
                  )}
                  aria-label={`Select ${color.name} theme`}
                />
                <span className="text-xs text-muted-foreground">{color.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>وضع المظهر</CardTitle>
          <CardDescription>
            اختر المظهر الفاتح، الداكن، أو اجعله يتبع إعدادات النظام.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex flex-col h-24 w-full"
            >
              <Sun className="h-8 w-8 mb-2" />
              <span>فاتح</span>
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex flex-col h-24 w-full"
            >
              <Moon className="h-8 w-8 mb-2" />
              <span>داكن</span>
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
              className="flex flex-col h-24 w-full"
            >
              <Monitor className="h-8 w-8 mb-2" />
              <span>النظام</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>إعدادات متقدمة</CardTitle>
          <CardDescription>
            خيارات للمساعدة في صيانة وتصحيح أخطاء التطبيق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dev-mode" className="font-medium">
                وضع الصيانة
              </Label>
              <p className="text-sm text-muted-foreground">
                تفعيل هذا الوضع سيعرض صفحة صيانة لجميع الطلاب.
              </p>
            </div>
            <Switch
              id="dev-mode"
              disabled={isLoadingSettings}
              checked={appSettings?.isMaintenanceMode || false}
              onCheckedChange={handleMaintenanceModeChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="leaderboard-toggle" className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                إظهار لوحة الصدارة للطلاب
              </Label>
              <p className="text-sm text-muted-foreground">
                التحكم في ظهور أو إخفاء لوحة الصدارة من قائمة الطلاب.
              </p>
            </div>
            <Switch
              id="leaderboard-toggle"
              disabled={isLoadingSettings}
              checked={appSettings?.isLeaderboardEnabled !== false}
              onCheckedChange={handleLeaderboardToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>إعدادات الدعم الفني</CardTitle>
          <CardDescription>
            حدد رقم هاتف الواتساب الذي سيتم استخدامه لرسائل الدعم من الطلاب.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="support-phone">رقم هاتف الدعم (واتساب)</Label>
            <Input
              id="support-phone"
              type="tel"
              value={supportPhoneNumber}
              onChange={(e) => setSupportPhoneNumber(e.target.value)}
              placeholder={isLoadingSettings ? "جار التحميل..." : "201012345678"}
              disabled={isLoadingSettings || isSavingSupport}
            />
             <p className="text-sm text-muted-foreground">
                سيتم استخدام هذا الرقم لتوجيه رسائل الدعم من الطلاب.
            </p>
          </div>
        </CardContent>
        <CardFooter>
           <Button onClick={handleSaveSupportSettings} disabled={isLoadingSettings || isSavingSupport}>
            {isSavingSupport && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ رقم الدعم
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>إعدادات الدفع</CardTitle>
          <CardDescription>
            تحديد رقم فودافون كاش الذي سيظهر للطلاب عند شحن الرصيد.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="vodafone-cash-number">رقم فودافون كاش</Label>
            <Input
              id="vodafone-cash-number"
              type="tel"
              value={vodafoneCashNumber}
              onChange={(e) => setVodafoneCashNumber(e.target.value)}
              placeholder={isLoadingSettings ? "جار التحميل..." : "01090404090"}
              disabled={isLoadingSettings || isSavingPayment}
            />
             <p className="text-sm text-muted-foreground">
                سيظهر هذا الرقم للطلاب لتحويل الأموال إليه.
            </p>
          </div>
        </CardContent>
        <CardFooter>
           <Button onClick={handleSavePaymentSettings} disabled={isLoadingSettings || isSavingPayment}>
            {isSavingPayment && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ رقم الدفع
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            إعدادات رفع الصور (ImgBB)
          </CardTitle>
          <CardDescription>
            قم بتغيير توكن API الخاص بحسابك على ImgBB لتوجيه الصور المرفوعة إليه.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="imgbb-api-key">API Key (Token)</Label>
            <PasswordInput
              id="imgbb-api-key"
              value={imgbbApiKey}
              onChange={(e) => setImgbbApiKey(e.target.value)}
              placeholder={isLoadingSettings ? "جار التحميل..." : "أدخل مفتاح الـ API هنا"}
              disabled={isLoadingSettings || isSavingImgbb}
            />
             <p className="text-xs text-muted-foreground">
                يمكنك الحصول على هذا المفتاح من إعدادات حسابك في <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">imgBB</a>.
            </p>
          </div>
        </CardContent>
        <CardFooter>
           <Button onClick={handleSaveImgbbSettings} disabled={isLoadingSettings || isSavingImgbb}>
            {isSavingImgbb && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ مفتاح الرفع
          </Button>
        </CardFooter>
      </Card>

       <Card className="mt-6">
        <CardHeader>
          <CardTitle>إعادة ضبط المنصة</CardTitle>
          <CardDescription>
            إجراءات مدمرة لحذف أجزاء كبيرة من بيانات المنصة مباشرة. استخدمها بحذر.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <ResetStepDialog
            title="حذف الاختبارات والنتائج"
            description="سيتم حذف جميع الاختبارات، الأسئلة، ونتائج الطلاب المسجلة في النظام فوراً."
            buttonText="مسح الاختبارات"
            resetTask="resetExams"
            disabled={false}
          />
          <ResetStepDialog
            title="حذف الكورسات والمحتويات"
            description="سيتم حذف جميع الكورسات، المحاضرات، المحتويات، واشتراكات الطلاب فوراً."
            buttonText="مسح الكورسات"
            resetTask="resetCourses"
            disabled={false}
          />
          <ResetStepDialog
            title="حذف الطلاب والبيانات العامة"
            description="سيتم حذف جميع الطلاب (باستثناء المسؤولين)، طلبات الدفع، الإشعارات، والإعلانات فوراً."
            buttonText="مسح الطلاب"
            resetTask="resetStudents"
            disabled={false}
          />
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle>حذف الحساب</CardTitle>
          <CardDescription>
            سيتم حذف حسابك كمسؤول وجميع بياناتك بشكل دائم.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end p-4 pt-0">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">حذف الحساب</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>هل أنت متأكد تمامًا؟</DialogTitle>
                <DialogDescription>
                 {getReauthDescription()}
                </DialogDescription>
              </DialogHeader>
              {isPasswordSignIn && (
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>إلغاء</Button>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  disabled={isLoading || (isPasswordSignIn && !password)}
                >
                  {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {isLoading ? 'جارِ الحذف...' : 'تأكيد الحذف'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
}
