'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LoadingAnimation } from '@/components/ui/loading-animation';

/**
 * الصفحة الرئيسية: بوابة التوجيه الذكية.
 * تقوم بفحص حالة المستخدم (مسؤول أم طالب) وتوجيهه للمكان الصحيح.
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
            // 1. فحص إذا كان المستخدم مسؤولاً (Accessing roles_admin requires isSignedIn)
            const adminRoleDoc = doc(firestore, 'roles_admin', user.uid);
            const adminDocSnap = await getDoc(adminRoleDoc);

            if (adminDocSnap.exists()) {
                router.replace('/admin/dashboard');
                return;
            }

            // 2. فحص الطلاب والحالة (Accessing users/UID requires isOwner)
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // المستخدم مسجل في Auth ولكن ليس له بيانات في Firestore (حالة نادرة)
                router.replace('/login');
                return;
            }

            if (userDocSnap.data()?.isBanned) {
                // تسجيل خروج فوري للحسابات المحظورة
                await signOut(auth);
                localStorage.removeItem('exam_prep_session');
                router.replace('/login');
                return;
            }

            // 3. توجيه الطالب إلى لوحة التحكم الخاصة به (تم التغيير لتصفح الكورسات)
            router.replace('/dashboard/courses');
            
        } catch (e) {
            console.error("Redirect logic error:", e);
            // في حالة خطأ الأذونات أو الشبكة، نعود لصفحة الدخول كإجراء احترازي
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
