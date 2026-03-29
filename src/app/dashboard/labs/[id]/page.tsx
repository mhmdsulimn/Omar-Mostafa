'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
} from '@/components/ui/button';
import { 
  Maximize, 
  FlaskConical, 
  AlertCircle, 
  ChevronRight,
  Minimize
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LabExperiment } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { Badge } from '@/components/ui/badge';

export default function LabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params.id as string;
  const firestore = useFirestore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const labDocRef = useMemoFirebase(
    () => (firestore && labId ? doc(firestore, 'labs', labId) : null),
    [firestore, labId]
  );
  const { data: lab, isLoading } = useDoc<LabExperiment>(labDocRef);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error enabling full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingAnimation size="lg" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">التجربة غير موجودة</h2>
        <Button onClick={() => router.back()}>الرجوع للمعمل</Button>
      </div>
    );
  }

  return (
    <div className="relative -mx-3 md:-mx-6 -mt-3 md:-mt-6 w-[calc(100%+24px)] md:w-[calc(100%+48px)] h-[calc(100vh-80px)] md:h-[calc(100vh-108px)] overflow-hidden bg-black flex flex-col group/page">
      {/* 
          Force hide scrollbar on the main dashboard container when this page is active.
          This ensures the immersive lab feel.
      */}
      <style jsx global>{`
        main {
          overflow: hidden !important;
          scrollbar-width: none !important;
        }
        main::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
      
      {/* Immersive Top Header - Floating Style */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-transform duration-500 group-hover/page:translate-y-0 -translate-y-full md:translate-y-0">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()} 
            className="rounded-full bg-black/40 border-white/10 text-white hover:bg-white/20 backdrop-blur-md h-10 w-10"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="flex flex-col text-right">
            <h1 className="text-sm md:text-xl font-black text-white drop-shadow-md line-clamp-1">{lab.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="rounded-full bg-white/10 border-white/10 text-white hover:bg-white/20 backdrop-blur-md h-10 w-10"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main Experiment Iframe - Full Dimension */}
      <div 
        ref={containerRef}
        className="flex-1 w-full bg-black relative group/sim overflow-hidden"
      >
        <iframe
          src={lab.embedUrl}
          className="absolute inset-0 w-full h-full border-none"
          allowFullScreen
          title={lab.title}
          sandbox="allow-scripts allow-same-origin allow-popups"
        ></iframe>

        {/* Floating Help Hint - Only visible briefly or on hover */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/sim:opacity-100 transition-opacity duration-700 pointer-events-none">
          <Badge className="bg-black/60 backdrop-blur-xl border-white/10 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-tighter shadow-2xl">
            تفاعل مع الشاشة للبدء في المختبر 🧪
          </Badge>
        </div>
      </div>

      {/* Background Decor - Grid Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
    </div>
  );
}
