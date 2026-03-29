'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useAuth, useMemoFirebase, setDocumentNonBlocking, errorEmitter, FirestorePermissionError } from '@/firebase';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import * as React from 'react';
import { PasswordInput } from '@/components/ui/password-input';
import { doc, writeBatch, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/data';
import { useTheme } from 'next-themes';

const colorOptions = [
  { name: 'افتراضي', value: '210 100% 60%', className: 'bg-blue-500' },
  { name: 'زمردي', value: '147 45% 49%', className: 'bg-emerald-600' },
  { name: 'وردي', value: '330 80% 60%', className: 'bg-pink-500' },
  { name: 'برتقالي', value: '27 87% 67%', className: 'bg-orange-500' },
  { name: 'بنفسجي', value: '262 85% 60%', className: 'bg-purple-600' },
  { name: 'أحمر', value: '0 84% 60%', className: 'bg-red-500' },
  { name: 'ذهبي ملكي', value: '45 100% 42%', className: 'bg-[#d4af37]' },
];

export default function StudentSettingsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [primaryColor, setPrimaryColor] = React.useState<string | undefined>(undefined);
  const { theme, setTheme } = useTheme();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { isLoading: isUserDataLoading } = useDoc(userDocRef);

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

  const signInProvider = user?.providerData[0]?.providerId;
  const isGoogleSignIn = signInProvider === GoogleAuthProvider.PROVIDER_ID;
  const isPasswordSignIn = signInProvider === EmailAuthProvider.PROVIDER_ID;

  const handleColorChange = (colorValue: string) => {
    if (!userDocRef) return;
    const themeData = { theme: { primaryColor: colorValue } };
    try {
      setDocumentNonBlocking(userDocRef, themeData, { merge: true });
      toast({
        title: 'تم تحديث المظهر',
        description: 'تم حفظ لونك المفضل بنجاح.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'فشل تحديث المظهر',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) return;

    setIsLoading(true);
    try {
      // المرحلة الأولى: إعادة المصادقة للتأكد من هوية المستخدم
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
      
      // المرحلة الثانية: جمع وحذف كافة البيانات المرتبطة بالطالب في Firestore
      const batch = writeBatch(firestore);
      const uid = user.uid;

      // 1. حذف سجلات الاختبارات
      const studentExamsSnap = await getDocs(collection(firestore, 'users', uid, 'studentExams'));
      studentExamsSnap.docs.forEach(d => batch.delete(d.ref));

      // 2. حذف اشتراكات الكورسات وسجلات التقدم
      const studentCoursesSnap = await getDocs(collection(firestore, 'users', uid, 'studentCourses'));
      for (const courseDoc of studentCoursesSnap.docs) {
          const progressSnap = await getDocs(collection(courseDoc.ref, 'progress'));
          progressSnap.docs.forEach(p => batch.delete(p.ref));
          batch.delete(courseDoc.ref);
      }

      // 3. حذف طلبات الشحن
      const depositsSnap = await getDocs(collection(firestore, 'users', uid, 'depositRequests'));
      depositsSnap.docs.forEach(d => batch.delete(d.ref));

      // 4. حذف الإشعارات
      const notifsSnap = await getDocs(collection(firestore, 'users', uid, 'notifications'));
      notifsSnap.docs.forEach(d => batch.delete(d.ref));

      // 5. حذف وثيقة الملف الشخصي الرئيسية
      batch.delete(doc(firestore, 'users', uid));

      // تنفيذ عملية الحذف الجماعي في Firestore
      batch.commit()
        .then(async () => {
            // المرحلة الثالثة: حذف حساب المستخدم من نظام المصادقة (Auth)
            await deleteUser(user);
            
            toast({
              title: 'تم حذف الحساب نهائياً',
              description: 'تم مسح كافة بياناتك بنجاح. نتمنى لك التوفيق دائماً.',
            });
            setIsDialogOpen(false);
            window.location.href = '/login'; 
        })
        .catch(async (err) => {
            // معالجة أخطاء الصلاحيات سياقياً
            const permissionError = new FirestorePermissionError({
                path: `users/${uid}`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsLoading(false);
        });

    } catch (error: any) {
      console.error('Account deletion process failed:', error);
      let errorMsg = 'فشلت عملية إعادة المصادقة. يرجى المحاولة مرة أخرى.';
      if (error.code === 'auth/wrong-password') {
          errorMsg = 'كلمة المرور التي أدخلتها غير صحيحة.';
      } else if (error.code === 'auth/requires-recent-login') {
          errorMsg = 'يجب تسجيل الخروج والدخول مرة أخرى للقيام بهذا الإجراء الحساس.';
      }

      toast({
        variant: 'destructive',
        title: 'فشل حذف الحساب',
        description: errorMsg,
      });
      setIsLoading(false);
    }
  };
  
  const getReauthDescription = () => {
    if (isGoogleSignIn) {
        return 'هذا الإجراء سيؤدي لحذف كافة درجاتك واشتراكاتك فوراً ولا يمكن التراجع عنه. سيتم توجيهك لـ Google للتأكد من هويتك.';
    }
    return 'هذا الإجراء سيؤدي لحذف كافة درجاتك واشتراكاتك فوراً ولا يمكن التراجع عنه. يرجى إدخال كلمة المرور للتأكيد.';
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
          { isUserDataLoading ? (
            <div className="flex flex-wrap gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
           ) : (
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
           )
          }
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
      
      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">منطقة الخطر: حذف الحساب</CardTitle>
          <CardDescription>
            سيؤدي هذا الإجراء إلى مسح كافة بياناتك وسجلك الدراسي نهائياً من المنصة.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end p-4 pt-0">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="font-bold">حذف الحساب والبيانات</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-right">تأكيد الحذف النهائي</DialogTitle>
                <DialogDescription className="text-right">
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
              <DialogFooter className="gap-2 sm:justify-start">
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading} className="rounded-xl">إلغاء</Button>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="rounded-xl font-bold"
                  disabled={isLoading || (isPasswordSignIn && !password)}
                >
                  {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'تأكيد الحذف'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
}