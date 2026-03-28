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
 * 1. يمنع فتح الحساب من أكثر من جهاز في وقت واحد.
 * 2. يراقب الحظر اللحظي (Banned) ويقوم بطرد المستخدم فوراً.
 * 3. يراقب حذف الحساب (Ghost Session) مع حماية ضد ضعف الإنترنت.
 * 4. يحمي المحتوى من أدوات المطور والنسخ.
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

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  // نستخدم destructuring لجلب الخطأ أيضاً للتعامل مع ضعف الإنترنت
  const { data: studentData, isLoading: isLoadingStudent, error: studentError } = useDoc<Student>(userDocRef);

  // 1. مراقبة تعدد الأجهزة والتبديل اللحظي
  React.useEffect(() => {
    if (!studentData || !user) return;

    const localSessionId = localStorage.getItem('exam_prep_session');
    const cloudSessionId = studentData.currentSessionId;

    if (cloudSessionId && localSessionId && cloudSessionId !== localSessionId) {
      setShowLogoutDialog(true);
    }
  }, [studentData, user]);

  // 2. مراقبة الحظر وحذف الحساب (مع حماية ضد تقلبات الشبكة)
  React.useEffect(() => {
    if (isUserLoading || isLoadingStudent || !user) return;

    // إذا وجد خطأ في جلب البيانات (غالباً بسبب الإنترنت)، لا نفعل شيئاً وننتظر المحاولة القادمة
    if (studentError) return;

    // حالة حذف الحساب: لا نظهر الرسالة إلا إذا كان الاتصال سليماً والبيانات فارغة تماماً (null)
    if (studentData === null && !isLoadingStudent && !studentError) {
        // ننتظر قليلاً (2 ثانية) للتأكد أن الحساب فعلاً محذوف وليس مجرد تأخر في الاستجابة
        const timer = setTimeout(() => {
            setShowDeletedDialog(true);
        }, 2000);
        return () => clearTimeout(timer);
    }

    // حالة الحظر اللحظي
    if (studentData && studentData.isBanned) {
        setShowBannedDialog(true);
        return;
    }
  }, [studentData, isUserLoading, isLoadingStudent, user, studentError]);

  const handleForceLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        localStorage.removeItem('exam_prep_session');
        router.replace('/login');
      } catch (e) {
        window.location.href = '/login';
      }
    }
  };

  // 3. حماية المتصفح من أدوات المطور
  React.useEffect(() => {
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
  }, [toast]);

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
