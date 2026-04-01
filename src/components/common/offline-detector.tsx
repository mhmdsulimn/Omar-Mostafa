'use client';

import * as React from 'react';
import { OfflineUI } from './offline-ui';

/**
 * مراقب حالة الاتصال الذكي المطوّر:
 * تم رفع نظام "تأكيد الانقطاع" إلى 5 ثوانٍ لضمان عدم ظهور صفحة الأوفلاين عند حدوث أي تذبذب بسيط.
 */
export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const offlineTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        if (offlineTimerRef.current) {
          clearTimeout(offlineTimerRef.current);
          offlineTimerRef.current = null;
        }
        setIsOffline(false);
      } else {
        // الانتظار 5 ثوانٍ قبل تأكيد الانقطاع لمنع الإزعاج من تذبذب الشبكة
        if (!offlineTimerRef.current) {
          offlineTimerRef.current = setTimeout(() => {
            if (!navigator.onLine) {
              setIsOffline(true);
            }
            offlineTimerRef.current = null;
          }, 5000); 
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

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
