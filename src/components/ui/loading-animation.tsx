'use client';

import * as React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { cn } from '@/lib/utils';

interface LoadingAnimationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * مكون التحميل التعليمي 3D المتقدم.
 * تم تحسينه لضمان الظهور الفوري والاستقرار في كافة المتصفحات.
 */
export function LoadingAnimation({ className, size = 'md' }: LoadingAnimationProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-56 h-56'
  };

  const blurMap = {
    sm: 'blur-[20px]',
    md: 'blur-[35px]',
    lg: 'blur-[50px]'
  };

  // عرض حاوية فارغة بنفس الحجم أثناء مرحلة الـ Mounting لمنع الـ Hydration Error
  if (!isMounted) {
    return (
      <div className={cn("flex items-center justify-center", sizeMap[size], className)}>
        <div className={cn("absolute inset-0 bg-primary/5 rounded-full", blurMap[size])} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center select-none animate-in fade-in duration-200", className)}>
      <div className={cn("relative flex items-center justify-center overflow-visible", sizeMap[size])}>
        
        {/* هالة ضوئية خلفية متوهجة تتبع لون السمة */}
        <div className={cn("absolute inset-0 bg-primary/10 rounded-full animate-pulse", blurMap[size])} />
        
        {/* مشغل الأنيميشن Lottie 3D المباشر - تم تحديث الرابط للنسخة الجديدة المطلوبة */}
        <DotLottieReact
          src="https://lottie.host/a7dad1e4-fcc7-4227-b1d3-b261cd327998/O5eXjXExfe.lottie"
          loop
          autoplay
          className="relative z-10 w-full h-full"
        />
      </div>
    </div>
  );
}
