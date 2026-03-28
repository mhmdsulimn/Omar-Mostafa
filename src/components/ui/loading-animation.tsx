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
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-72 h-72'
  };

  // عرض حاوية فارغة بنفس الحجم أثناء مرحلة الـ Mounting لمنع الـ Hydration Error
  if (!isMounted) {
    return (
      <div className={cn("flex items-center justify-center", sizeMap[size], className)}>
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-[40px]" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center select-none animate-in fade-in duration-200", className)}>
      <div className={cn("relative flex items-center justify-center overflow-visible", sizeMap[size])}>
        
        {/* هالة ضوئية خلفية متوهجة تتبع لون السمة */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-[50px] animate-pulse" />
        
        {/* مشغل الأنيميشن Lottie 3D المباشر - تم تحديث الرابط للنسخة الأسرع */}
        <DotLottieReact
          src="https://lottie.host/16f4696d-4c5b-4871-865a-27e3f677cb26/iWSv2oF75k.lottie"
          loop
          autoplay
          className="relative z-10 w-full h-full"
        />
      </div>
    </div>
  );
}
