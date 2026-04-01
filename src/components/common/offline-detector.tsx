
'use client';

import * as React from 'react';
import { OfflineUI } from './offline-ui';

/**
 * مراقب حالة الاتصال الذكي المطوّر:
 * تم إضافة نظام "تأكيد الانقطاع" لضمان عدم ظهور صفحة الأوفلاين عند حدوث تذبذب لحظي في الشبكة.
 * يتم الانتظار لمدة 3 ثوانٍ قبل تأكيد الانقطاع لضمان استقرار التجربة.
 */
export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const offlineTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        // إذا عاد الاتصال، نلغي أي مؤقت للحظر ونخفي واجهة الأوفلاين فوراً
        if (offlineTimerRef.current) {
          clearTimeout(offlineTimerRef.current);
          offlineTimerRef.current = null;
        }
        setIsOffline(false);
      } else {
        // إذا انقطع الاتصال، ننتظر 3 ثوانٍ للتأكد من أنه ليس تذبذباً عابراً
        if (!offlineTimerRef.current) {
          offlineTimerRef.current = setTimeout(() => {
            if (!navigator.onLine) {
              setIsOffline(true);
            }
            offlineTimerRef.current = null;
          }, 3000); 
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // فحص أولي عند التحميل
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       updateOnlineStatus();
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  if (isOffline) {
    return <OfflineUI />;
  }

  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
