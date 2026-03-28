'use client';

import * as React from 'react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';

interface SecureVideoPlayerProps {
  videoUrl: string;
}

export function SecureVideoPlayer({ videoUrl }: SecureVideoPlayerProps) {
  const { user } = useUser();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const watermarkRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleFullscreenToggle = () => {
    const element = wrapperRef.current;
    if (!element) return;
    
    if (!document.fullscreenElement) {
        element.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // 1. Prevent Right-Click and DevTools shortcuts
  React.useEffect(() => {
    const handleContextmenu = (e: MouseEvent) => e.preventDefault();
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || 
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
      }
    };

    const targetNode = wrapperRef.current;
    if (targetNode) {
        targetNode.addEventListener('contextmenu', handleContextmenu);
        window.addEventListener('keydown', handleKeydown);
    }
    
    return () => {
      if (targetNode) {
        targetNode.removeEventListener('contextmenu', handleContextmenu);
      }
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);
  
  // 2. Teleport Watermark randomly
  React.useEffect(() => {
    const watermark = watermarkRef.current;
    const wrapper = wrapperRef.current;

    if (!watermark || !wrapper) return;

    const teleportWatermark = () => {
      watermark.style.opacity = '0';
      
      setTimeout(() => {
        const maxX = wrapper.clientWidth - watermark.offsetWidth;
        const maxY = wrapper.clientHeight - watermark.offsetHeight;
        const randX = Math.random() * maxX;
        const randY = Math.random() * maxY;

        watermark.style.left = `${randX}px`;
        watermark.style.top = `${randY}px`;
        watermark.style.opacity = '1';
      }, 500);
    };
    
    setTimeout(teleportWatermark, 1000); 
    const intervalId = setInterval(teleportWatermark, 3000); 

    return () => clearInterval(intervalId);
  }, [user]);

  if (!videoUrl) {
    return (
      <div className="aspect-video w-full bg-muted rounded-2xl flex items-center justify-center text-destructive-foreground">
        <p>رابط الفيديو غير متوفر.</p>
      </div>
    );
  }
  
  const getSanitizedUrl = () => {
    try {
      const url = new URL(videoUrl);
      if (url.hostname.includes('screenpal.com')) {
        url.searchParams.set('fs', '0');
        url.searchParams.set('ff', '1');
        url.searchParams.set('title', '0');
      }
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        url.searchParams.set('fs', '0');
        url.searchParams.set('rel', '0');
        url.searchParams.set('controls', '1');
      }
      if (url.hostname.includes('vimeo.com')) {
        url.searchParams.set('fullscreen', '0');
        url.searchParams.set('byline', '0');
        url.searchParams.set('portrait', '0');
        url.searchParams.set('title', '0');
      }
      return url.toString();
    } catch (error) {
      return videoUrl;
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full aspect-video bg-background rounded-2xl overflow-hidden shadow-2xl"
      )}
    >
      <iframe
        className="w-full h-full"
        src={getSanitizedUrl()}
        title="Course Video Player"
        sandbox="allow-scripts allow-same-origin allow-popups"
        allow="autoplay; picture-in-picture; fullscreen"
        scrolling="no"
      ></iframe>

      <div
        ref={watermarkRef}
        className={cn(
          'absolute text-lg md:text-xl font-bold text-red-500/50 pointer-events-none select-none transition-opacity duration-300 opacity-0'
        )}
      >
        {user?.email || ''}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-1 right-1 z-10 h-8 w-8 p-1 text-white bg-[#282c2f] hover:bg-[#282c2f]/90 hover:text-white/75 transition-opacity duration-300 opacity-100"
        onClick={handleFullscreenToggle}
      >
        {isFullscreen ? <Minimize /> : <Maximize />}
        <span className="sr-only">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
      </Button>
    </div>
  );
}
