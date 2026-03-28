'use client';

import * as React from 'react';
import { useNavigationLoader } from '@/hooks/use-navigation-loader';
import { cn } from '@/lib/utils';

/**
 * شريط تحميل التنقل (Navigation Loader):
 * تم تحديثه لمنع أخطاء الـ Hydration عبر التأكد من الرندر على المتصفح فقط.
 */
export function NavigationLoader() {
  const { isLoading, progress } = useNavigationLoader();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 w-full h-1 z-[101] transition-opacity duration-300 pointer-events-none',
        isLoading ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_hsl(var(--primary-glow)),_0_0_5px_hsl(var(--primary-glow))] transition-all duration-300 ease-out"
        style={{
            width: `${progress}%`,
        }}
      />
    </div>
  );
}
