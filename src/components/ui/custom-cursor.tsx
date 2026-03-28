'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * مكون الماوس المخصص الاحترافي - نسخة الأداء الفائق (Turbo Version).
 * تم رفع سرعة الاستجابة وتثبيت نظام كبت ماوس الجهاز تماماً.
 */
export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [isOverScrollbar, setIsOverScrollbar] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -100, y: -100 }); 
  const currentPos = useRef({ x: -100, y: -100 }); 
  const requestRef = useRef<number | null>(null);

  const NORMAL_CURSOR = "https://i.postimg.cc/vBSwZ6p4/cursor.png";
  const HOVER_CURSOR = "https://i.postimg.cc/nzwfhQ6M/cursor2.png";

  /**
   * دالة التحريك - تم رفع الـ easing لسرعة استجابة مذهلة
   */
  const animate = () => {
    const easing = 0.6; // سرعة تتبع عالية جداً (0.1 كانت بطيئة)

    const dx = mousePos.current.x - currentPos.current.x;
    const dy = mousePos.current.y - currentPos.current.y;

    currentPos.current.x += dx * easing;
    currentPos.current.y += dy * easing;

    // توقف عن التحديث إذا كان الفرق غير مرئي لتوفير المعالج
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      currentPos.current.x = mousePos.current.x;
      currentPos.current.y = mousePos.current.y;
    }

    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  /**
   * رصد أشرطة التمرير بدقة ميكرونية لحظية
   */
  const checkScrollbar = (e: MouseEvent) => {
    const html = document.documentElement;
    const isRTL = getComputedStyle(html).direction === 'rtl';
    const winScrollW = window.innerWidth - html.clientWidth;
    const winScrollH = window.innerHeight - html.clientHeight;

    // 1. النافذة الرئيسية
    if (winScrollW > 0) {
      if (isRTL && e.clientX <= winScrollW) return true;
      if (!isRTL && e.clientX >= html.clientWidth) return true;
    }
    if (winScrollH > 0 && e.clientY >= html.clientHeight) return true;

    // 2. العناصر الداخلية (الجداول، الصناديق)
    const target = e.target as HTMLElement;
    if (target && target !== html && target !== document.body) {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      const targetIsRTL = style.direction === 'rtl';
      
      const sw = target.offsetWidth - target.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
      const sh = target.offsetHeight - target.clientHeight - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);

      if (sw > 0) {
        if (targetIsRTL && e.clientX >= rect.left && e.clientX <= rect.left + sw) return true;
        if (!targetIsRTL && e.clientX >= rect.right - sw && e.clientX <= rect.right) return true;
      }
      if (sh > 0 && e.clientY >= rect.bottom - sh && e.clientY <= rect.bottom) return true;
    }

    return false;
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      
      const over = checkScrollbar(e);
      setIsOverScrollbar(over);
      
      if (over) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const computedStyle = window.getComputedStyle(target);
      const isPointer = computedStyle.cursor === 'pointer';
      
      const interactiveSelectors = 'a, button, select, label, input, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], .cursor-pointer';

      if (isPointer || target.closest(interactiveSelectors)) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const onMouseLeave = () => setIsHidden(true);
    const onMouseEnter = () => setIsHidden(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.documentElement.addEventListener('mouseenter', onMouseEnter);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      document.documentElement.removeEventListener('mouseenter', onMouseEnter);
      document.documentElement.classList.remove('custom-cursor-active');
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isOverScrollbar || isHidden) {
      document.documentElement.classList.remove('custom-cursor-active');
    } else {
      document.documentElement.classList.add('custom-cursor-active');
    }
  }, [isOverScrollbar, isHidden, mounted]);

  if (!mounted) return null;

  const colorFilterStyle = {
    filter: `hue-rotate(calc(var(--primary-h) * 1deg - 210deg)) brightness(1.2) saturate(1.3)`,
  };

  return (
    <div
      ref={cursorRef}
      className={cn(
        "fixed top-0 left-0 pointer-events-none z-[9999] transition-opacity duration-100 ease-out will-change-transform",
        (isHidden || isOverScrollbar) && "opacity-0"
      )}
      style={{
        marginTop: '-4px',
        marginLeft: '-4px',
      }}
    >
      <div className="relative w-9 h-9">
        <img
          src={isHovering ? HOVER_CURSOR : NORMAL_CURSOR}
          alt="cursor"
          className={cn(
            "w-full h-full object-contain transition-transform duration-75 transform origin-center",
            isHovering ? "scale-90" : "scale-100"
          )}
          style={colorFilterStyle}
        />
      </div>
    </div>
  );
}
