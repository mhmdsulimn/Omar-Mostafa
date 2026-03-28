'use client';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * مكون اللوجو الرسمي: يعرض الشعار من رابط خارجي مباشر
 * ويقوم بتلوينه آلياً ليناسب اللون الرئيسي للمنصة.
 */
export function Logo({
  className,
  width,
  height,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  // الرابط المباشر للشعار الجديد
  const logoSrc = "/icons/logo.png";
  
  // أحجام افتراضية محسنة
  const w = width || 180;
  const h = height || 60;

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Image
        src={logoSrc}
        alt="لوجو عمر مصطفى"
        width={w}
        height={h}
        style={{ 
          height: 'auto',
          width: '100%',
          maxWidth: `${w}px`,
          // فلتر ذكي يحول لون الصورة إلى اللون الرئيسي (Primary HSL) المختار للمنصة
          filter: 'hue-rotate(calc(var(--primary-h) * 1deg - 210deg)) saturate(1.5) brightness(1.1)'
        }}
        className="object-contain transition-all duration-500 ease-in-out select-none pointer-events-none"
        priority
      />
    </div>
  );
}
