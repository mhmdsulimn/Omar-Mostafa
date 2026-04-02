'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/data';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

/**
 * مكون حماية الجلسة المطور:
 * 1. يمنع فتح الحساب من أكثر من جهاز في وقت واحد (للطلاب فقط).
 * 2. يراقب الحظر اللحظي (Banned) ويقوم بطرد المستخدم فوراً.
 * 3. يراقب حذف الحساب (Ghost Session) مع حماية ضد ضعف الإنترنت.
 * 4. يحمي المحتوى من أدوات المطور والنسخ (للطلاب فقط).
 * 5. يمنع الوصول إذا كانت البيانات الشخصية ناقصة.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [showDeletedDialog, setShowDeletedDialog] = React.useState(false);
  const [showBannedDialog, setShowBannedDialog] = React.useState(false);

  // التحقق مما إذا كان المستخدم مسؤولاً لتعطيل قيود الجلسة الواحدة له
  const adminDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'roles_admin', user.uid) : null),
    [user, firestore]
  );
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminDocRef);
  const isAdmin = !!adminRole;

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  // نستخدم destructuring لجلب الخطأ أيضاً للتعامل مع ضعف الإنترنت
  const { data: studentData, isLoading: isLoadingStudent, error: studentError } = useDoc<Student>(userDocRef);

  // 1. مراقبة تعدد الأجهزة والتبديل اللحظي (يتم التخطي للمسؤولين)
  React.useEffect(() => {
    if (!studentData || !user || isAdmin || isAdminLoading) return;

    if (typeof window !== 'undefined') {
      const localSessionId = localStorage.getItem('exam_prep_session');
      const cloudSessionId = studentData.currentSessionId;

      // إذا كان هناك معرف جلسة مختلف في السحابة، فهذا يعني أن جهازاً آخر قد سجل الدخول
      if (cloudSessionId && localSessionId && cloudSessionId !== localSessionId) {
        setShowLogoutDialog(true);
      }
    }
  }, [studentData, user, isAdmin, isAdminLoading]);

  // 2. مراقبة الحظر وحذف الحساب (مع حماية ضد تقلبات الشبكة)
  React.useEffect(() => {
    if (isUserLoading || isLoadingStudent || !user) return;

    // إذا وجد خطأ في جلب البيانات (غالباً بسبب الإنترنت)، لا نفعل شيئاً وننتظر المحاولة القادمة
    if (studentError) return;

    // حالة حذف الحساب: لا نظهر الرسالة إلا إذا كان الاتصال سليماً والبيانات فارغة تماماً (null) ولم يكن المستخدم مسؤولاً
    if (studentData === null && !isLoadingStudent && !studentError && !isAdmin && !isAdminLoading) {
        const timer = setTimeout(() => {
            setShowDeletedDialog(true);
        }, 2000);
        return () => clearTimeout(timer);
    }

    // حالة الحظر اللحظي (تنطبق على الجميع)
    if (studentData && studentData.isBanned) {
        setShowBannedDialog(true);
        return;
    }

    // --- شرط إكمال البيانات الإلزامي للطالب ---
    if (studentData && !isAdmin && !isAdminLoading) {
        const isIncomplete = !studentData.grade || !studentData.phoneNumber || !studentData.parentPhoneNumber;
        if (isIncomplete) {
            router.replace('/login');
            return;
        }
    }
  }, [studentData, isUserLoading, isLoadingStudent, user, studentError, isAdmin, isAdminLoading, router]);

  const handleForceLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('exam_prep_session');
        }
        router.replace('/login');
      } catch (e) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  };

  // 3. حماية المتصفح من أدوات المطور (يتم تعطيل الحماية للمسؤولين لتسهيل عملهم)
  React.useEffect(() => {
    if (isAdmin || typeof window === 'undefined') return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p')) ||
        (e.metaKey && e.altKey && e.key === 'i')
      ) {
        e.preventDefault();
        toast({
          variant: 'destructive',
          title: 'إجراء غير مسموح',
          description: 'محاولة الوصول لأدوات المطور محظورة لحماية المحتوى التعليمي.',
        });
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast, isAdmin]);

  return (
    <>
      <div className="select-none pointer-events-auto">
        {children}
      </div>

      <AlertDialog open={showLogoutDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">تنبيه أمني!</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              لقد تم فتح هذا الحساب من جهاز آخر. سيتم تسجيل خروجك لحماية خصوصيتك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleForceLogout} className="bg-destructive hover:bg-destructive/90">
              تسجيل الخروج الآن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBannedDialog}>
        <AlertDialogContent className="rounded-2xl border-destructive/20 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-xl font-bold">تنبيه: الحساب محظور</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-relaxed text-foreground/90">
              نأسف لإبلاغك بأنه قد تم حظر حسابك من قبل الإدارة. يرجى التواصل مع المسؤول لمعرفة الأسباب.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleForceLogout} className="bg-destructive hover:bg-destructive/90 h-12 rounded-xl font-bold">
              موافق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeletedDialog}>
        <AlertDialogContent className="rounded-2xl border-destructive/20 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-xl font-bold">انتهت صلاحية الجلسة</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-relaxed text-foreground/90">
              يبدو أن حسابك لم يعد متاحاً في الوقت الحالي. يرجى تسجيل الدخول مجدداً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleForceLogout} className="bg-destructive hover:bg-destructive/90 h-12 rounded-xl font-bold">
              الانتقال لصفحة الدخول
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
