
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, User, updateProfile, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { SocialLoginButton } from '@/components/common/social-login-button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShieldCheck, Sparkles, Copy } from 'lucide-react';
import { GradeSelectionDialog } from '@/components/common/grade-selection-dialog';
import type { Student } from '@/lib/data';
import { Logo } from '@/components/common/logo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { Button } from '@/components/ui/button';

/**
 * دالة توليد معرف فريد متوافقة مع كافة المتصفحات والأجهزة (حتى القديمة)
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails for any reason
    }
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [showGradeDialog, setShowGradeDialog] = React.useState(false);
  const [pendingProfileUser, setPendingProfileUser] = React.useState<User | null>(null);

  // Interaction Refs
  const cardRef = React.useRef<HTMLDivElement>(null);
  const shineRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || typeof window === 'undefined' || window.innerWidth < 768) return;
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    
    const rotateX = ((y / height) - 0.5) * -4;
    const rotateY = ((x / width) - 0.5) * 4;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    if (shineRef.current) {
      const px = (x / width) * 100;
      const py = (y / height) * 100;
      shineRef.current.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.06) 0%, transparent 60%)`;
      shineRef.current.style.opacity = '1';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
    if (shineRef.current) {
      shineRef.current.style.opacity = '0';
    }
  };

  React.useEffect(() => {
    if (!isUserLoading && user && !showGradeDialog) {
        processUser(user);
    }
  }, [isUserLoading, user, showGradeDialog]);

  const processUser = async (currentUser: User) => {
    if (!firestore || !auth) return;

    try {
      // 1. Check if user is an ADMIN first
      const adminRoleDoc = doc(firestore, 'roles_admin', currentUser.uid);
      const adminDocSnap = await getDoc(adminRoleDoc);

      if (adminDocSnap.exists()) {
        router.replace('/admin/dashboard');
        return;
      }

      // 2. If not admin, check student profiles
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as Student;
        if (userData.isBanned) {
          toast({ variant: 'destructive', title: 'الحساب محظور', description: 'تم حظر هذا الحساب. يرجى التواصل مع المسؤول.' });
          await signOut(auth);
        } else {
          const newSessionId = generateUUID();
          if (typeof window !== 'undefined') {
            localStorage.setItem('exam_prep_session', newSessionId);
          }
          await setDoc(userDocRef, { currentSessionId: newSessionId }, { merge: true });
          router.replace('/');
        }
      } else {
        setPendingProfileUser(currentUser);
        setShowGradeDialog(true);
      }
    } catch (error) {
      console.error("Process user error:", error);
    }
  };
  
  const handleSocialSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        console.error("Firebase Auth Error:", error);
        
        let errorTitle = 'فشل تسجيل الدخول';
        let errorDescription: React.ReactNode = 'حدث خطأ أثناء الاتصال بـ Google.';

        if (error.code === 'auth/unauthorized-domain') {
            const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
            errorTitle = 'دومين غير مصرح به';
            errorDescription = (
              <div className="space-y-3 text-right">
                <p>يجب إضافة هذا الدومين إلى Authorized Domains في Firebase Console:</p>
                <div className="flex items-center gap-2 bg-muted p-2 rounded border font-mono text-[10px] break-all">
                  <span className="flex-1">{currentDomain}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6" 
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(currentDomain);
                        toast({ title: "تم النسخ!" });
                      }
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">تأكد من نسخ الدومين بدون http أو أرقام المنافذ إذا لزم الأمر.</p>
              </div>
            );
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorTitle = 'تم إإغلاق النافذة';
            errorDescription = 'لقد قمت بإغلاق نافذة تسجيل الدخول قبل الإكمال.';
        }

        toast({ 
            variant: 'destructive', 
            title: errorTitle, 
            description: errorDescription 
        });
        setIsLoading(false);
    }
  };

  const handleGradeSelection = async (details: { 
    grade: Student['grade']; 
    fullName: string; 
    phoneNumber: string; 
    parentPhoneNumber: string; 
  }) => {
    if (!pendingProfileUser || !firestore) return;
    setIsLoading(true);
    try {
        const { grade, fullName, phoneNumber, parentPhoneNumber } = details;
        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ');
        
        await updateProfile(pendingProfileUser, { displayName: fullName });
        const newSessionId = generateUUID();
        if (typeof window !== 'undefined') {
          localStorage.setItem('exam_prep_session', newSessionId);
        }

        const userDocRef = doc(firestore, 'users', pendingProfileUser.uid);
        await setDoc(userDocRef, {
            id: pendingProfileUser.uid,
            firstName: firstName || '',
            lastName: lastName || '',
            email: pendingProfileUser.email,
            grade: grade,
            phoneNumber: phoneNumber,
            parentPhoneNumber: parentPhoneNumber,
            isBanned: false,
            balance: 0,
            currentSessionId: newSessionId,
            createdAt: new Date().toISOString(),
        }, { merge: true });

        router.replace('/welcome');
    } catch (error) {
         toast({ variant: 'destructive', title: 'فشل حفظ البيانات' });
         setIsLoading(false);
    }
  };

  if (isUserLoading || (user && !showGradeDialog)) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <LoadingAnimation size="lg" />
        </div>
    );
  }

  return (
    <>
      <GradeSelectionDialog
          isOpen={showGradeDialog}
          onClose={() => setShowGradeDialog(false)}
          onSave={handleGradeSelection}
          user={pendingProfileUser}
      />

      <div className="w-full max-w-md px-4 relative z-10">
        <div 
          className="relative transition-all duration-700 ease-out"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          ref={cardRef}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Card className="relative z-10 bg-white/80 dark:bg-[#0a0f18]/40 backdrop-blur-3xl border-slate-200/50 dark:border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
              <div ref={shineRef} className="absolute inset-0 z-20 pointer-events-none opacity-0 transition-opacity duration-500" />

              <CardHeader className="text-center space-y-6 pt-14 pb-8">
                  <div className="flex justify-center px-6">
                      <div className="relative group w-full max-w-[180px]">
                        <Logo width={180} height={60} className="relative z-10 transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute -top-3 -right-3 bg-amber-500 text-white p-1.5 rounded-full shadow-xl animate-pulse-soft">
                          <Sparkles size={14} />
                        </div>
                      </div>
                  </div>
                  <div className="space-y-2 px-4">
                    <CardTitle className="text-3xl font-headline font-bold text-slate-900 dark:text-foreground tracking-tight">أهلاً بك يا بطل</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500 dark:text-muted-foreground/80 leading-relaxed">
                      بوابتك الذكية للتميز مع مستر عمر مصطفي
                    </CardDescription>
                  </div>
              </CardHeader>

              <CardContent className="px-10 pb-14 space-y-10">
                  <div className="space-y-6">
                      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-muted-foreground font-bold uppercase tracking-[0.25em] opacity-60 dark:opacity-40">
                        <ShieldCheck size={12} className="text-primary" />
                        <span>دخول آمن وموثوق</span>
                      </div>
                      <SocialLoginButton 
                          provider="google" 
                          onClick={handleSocialSignIn} 
                          isLoading={isLoading} 
                          className="h-14 rounded-2xl shadow-sm border-slate-200 dark:border-white/5 text-sm font-bold bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                      />
                  </div>
              </CardContent>

              <CardFooter className="flex justify-center p-8 pt-0 opacity-40 dark:opacity-30">
                  <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-500 dark:text-muted-foreground">Mr Omar Mostafa</p>
              </CardFooter>
          </Card>

          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] opacity-10 blur-[100px] pointer-events-none bg-gradient-to-tr from-primary to-cyan-500 rounded-full" />
        </div>
      </div>
    </>
  );
}
