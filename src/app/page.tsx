'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import type { Student } from '@/lib/data';

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
            // 1. فحص إذا كان المستخدم مسؤولاً
            const adminRoleDoc = doc(firestore, 'roles_admin', user.uid);
            const adminDocSnap = await getDoc(adminRoleDoc);

            if (adminDocSnap.exists()) {
                router.replace('/admin/dashboard');
                return;
            }

            // 2. فحص الطلاب والحالة
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // إذا كان المستخدم ليس مسؤولاً وليس له ملف طالب، نعيده للدخول لإكمال بياناته
                router.replace('/login');
                return;
            }

            const userData = userDocSnap.data() as Student;

            if (userData.isBanned) {
                // تسجيل خروج فوري للحسابات المحظورة
                await signOut(auth);
                localStorage.removeItem('exam_prep_session');
                router.replace('/login');
                return;
            }

            // --- شرط إكمال البيانات الإلزامي ---
            // إذا كان الصف أو رقم الطالب أو رقم ولي الأمر مفقوداً
            const isIncomplete = !userData.grade || !userData.phoneNumber || !userData.parentPhoneNumber;
            if (isIncomplete) {
                router.replace('/login');
                return;
            }

            // 3. توجيه الطالب إلى لوحة التحكم
            router.replace('/dashboard/courses');
            
        } catch (e) {
            console.error("Redirect logic error:", e);
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
