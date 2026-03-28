'use client';

import React from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * واجهة الأوفلاين المحدثة:
 * 1. حذف اللوجو تماماً لضمان الاستقرار.
 * 2. زر إعادة محاولة فعال يقوم بتحديث الصفحة.
 * 3. رسالة واضحة تخبر الطالب بأن الموقع سيعود تلقائياً.
 */
export function OfflineUI() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center select-none font-body">
      {/* Cinematic Background Decoration */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-5%] h-[30rem] w-[30rem] rounded-full bg-primary/10 filter blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-5%] h-[25rem] w-[25rem] rounded-full bg-cyan-500/10 filter blur-[80px] animate-blob [animation-delay:-4s]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Offline Icon with Pulse Effect */}
        <div className="relative inline-flex items-center justify-center p-8 rounded-full bg-muted/50 border border-border shadow-inner">
          <WifiOff className="h-16 w-16 text-muted-foreground animate-pulse" />
          <div className="absolute -top-2 -right-2 bg-destructive text-white p-2 rounded-full shadow-lg border-4 border-background">
            <RefreshCcw className="h-4 w-4 animate-spin-slow" />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3 px-4">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">أنت الآن خارج الاتصال</h1>
          <p className="text-muted-foreground font-bold leading-relaxed text-sm md:text-base">
            يبدو أن هناك مشكلة في الاتصال بالإنترنت حالياً. لا تقلق، سيتم استرجاع الصفحة <span className="text-primary font-black">تلقائياً</span> بمجرد عودة الشبكة.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-3 pt-4 max-w-[280px] mx-auto w-full">
          <Button 
            onClick={handleRetry} 
            size="lg" 
            className="h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 gap-2 border-b-4 border-primary-shadow active:border-b-0 active:translate-y-1 transition-all"
          >
            <RefreshCcw className="h-5 w-5" />
            إعادة المحاولة
          </Button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 opacity-30">
        <p className="text-[10px] uppercase tracking-[0.3em] font-black">Mr Omar Mostafa</p>
      </div>
    </div>
  );
}
