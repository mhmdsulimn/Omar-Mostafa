'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
}

const emitter = new EventEmitter();
const START_EVENT = 'navigation-start';
const END_EVENT = 'navigation-end';

export const useNavigationLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startLoader = useCallback(() => {
    emitter.emit(START_EVENT);
  }, []);

  const stopLoader = useCallback(() => {
    emitter.emit(END_EVENT);
  }, []);

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
      setProgress(0);
      if (timerRef.current) clearInterval(timerRef.current);

      // Accelerated start for better perceived speed
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + 15; // Fast jump at start
          if (prev < 60) return prev + 5;  // Moderate mid speed
          if (prev < 90) return prev + 1;  // Slow down near end
          return 90;
        });
      }, 80);
    };

    const handleEnd = () => {
       if (timerRef.current) clearInterval(timerRef.current);
       setProgress(100);
       setTimeout(() => {
           setIsLoading(false);
           setProgress(0);
       }, 200);
    };

    emitter.on(START_EVENT, handleStart);
    emitter.on(END_EVENT, handleEnd);

    return () => {
        if(timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  useEffect(() => {
    stopLoader();
  }, [pathname, stopLoader]);

  return { isLoading, progress, startLoader, stopLoader };
};
