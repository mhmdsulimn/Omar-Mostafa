'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LoadingAnimation } from '@/components/ui/loading-animation';

/**
 * الصفحة الرئيسية: بوابة التوجيه الذكية.
 * تعالج حالات تسجيل الدخول، الأدوار، وتطرد الجلسات المحذوفة أو المحظورة فوراً.
 */
export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const checkRoleAndRedirect = async () => {
        if (!firestore || !auth) return;
        
        try {
            // 1. فحص المسؤولين
            const adminRoleDoc = doc(firestore, 'roles_admin', user.uid);
            const adminDocSnap = await getDoc(adminRoleDoc);

            if (adminDocSnap.exists()) {
                router.replace('/admin/dashboard');
                return;
            }

            // 2. فحص الطلاب والحالة (حظر/حذف)
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists() || userDocSnap.data()?.isBanned) {
                // تنظيف فوري للجلسات غير الصالحة
                await signOut(auth);
                localStorage.removeItem('exam_prep_session');
                router.replace('/login');
                return;
            }

            // 3. توجيه الطالب النشط
            router.replace('/dashboard/courses');
            
        } catch (e) {
            router.replace('/login');
        }
    };

    checkRoleAndRedirect();
    
  }, [user, isUserLoading, firestore, auth, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingAnimation size="lg" />
    </div>
  );
}
