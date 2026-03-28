'use client';

import * as React from 'react';
import { OfflineUI } from './offline-ui';

/**
 * مراقب حالة الاتصال الذكي: 
 * 1. يعرض واجهة الأوفلاين فور انقطاع الإنترنت.
 * 2. يعيد الطالب للموقع تلقائياً وفوراً بمجرد عودة الاتصال بفضل مستمعات الأحداث.
 */
export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    
    // تحديث الحالة بناءً على حالة المتصفح الحالية
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // فحص أولي عند التحميل
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    // الاستماع لتغييرات الشبكة اللحظية للعودة التلقائية
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // حماية الـ Hydration لضمان توافق الرندر الأول مع السيرفر
  if (!isMounted) {
    return <>{children}</>;
  }

  // إذا كان الطالب أوفلاين، نعرض الواجهة المخصصة بدون لوجو
  if (isOffline) {
    return <OfflineUI />;
  }

  // عند عودة الإنترنت، يختفي المكون ويظهر الموقع تلقائياً
  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
