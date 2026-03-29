'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/ui/loading-animation';

/**
 * صفحة التوجيه: تقوم بتحويل الطالب تلقائياً إلى صفحة تصفح الكورسات.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // توجيه الطالب إلى الرابط الجديد لتصفح الكورسات كصفحة رئيسية
    router.replace('/dashboard/courses');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingAnimation size="lg" />
    </div>
  );
}
