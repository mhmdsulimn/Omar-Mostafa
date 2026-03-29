
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Maximize, 
  FlaskConical, 
  AlertCircle, 
  Info, 
  ChevronRight,
  ChevronLeft,
  X,
  BookOpen
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LabExperiment } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function LabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params.id as string;
  const firestore = useFirestore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const labDocRef = useMemoFirebase(
    () => (firestore && labId ? doc(firestore, 'labs', labId) : null),
    [firestore, labId]
  );
  const { data: lab, isLoading } = useDoc<LabExperiment>(labDocRef);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

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
    <div className="relative -mx-3 md:-mx-6 -mt-3 md:-mt-6 h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] overflow-hidden bg-black flex flex-col group/page">
      
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
            <div className="flex items-center justify-end gap-2 text-[10px] text-primary-foreground/70 font-bold uppercase">
              <span>PhET Interactive Simulation</span>
              <FlaskConical className="h-3 w-3" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Instructions Sidebar Trigger */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="rounded-full bg-primary/20 border-primary/30 text-primary-foreground hover:bg-primary/30 backdrop-blur-md px-4 gap-2 font-black h-10"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">دليل التجربة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-md bg-card/95 backdrop-blur-2xl border-white/5 p-0 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="p-6 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </div>
                    <SheetTitle className="text-xl font-black">إرشادات المختبر</SheetTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full h-8 w-8">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      عن هذه التجربة
                    </h3>
                    <p className="text-sm md:text-base leading-relaxed font-medium text-muted-foreground whitespace-pre-wrap">
                      {lab.description || 'لا توجد تعليمات إضافية لهذه التجربة.'}
                    </p>
                  </div>

                  <Card className="rounded-3xl bg-primary/5 border-dashed border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="bg-primary text-white p-2 rounded-full animate-bounce">
                          <Maximize className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-black">نصيحة تقنية</p>
                        <p className="text-xs text-muted-foreground font-bold">
                          استخدم زر التكبير في الزاوية للحصول على أفضل دقة بصرية أثناء التفاعل مع المكونات.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-6 border-t bg-muted/30 text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Mr Omar Mostafa • Physics Lab
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="rounded-full bg-white/10 border-white/10 text-white hover:bg-white/20 backdrop-blur-md h-10 w-10"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Experiment Iframe - Full Dimension */}
      <div 
        ref={containerRef}
        className="flex-1 w-full bg-black relative group/sim"
      >
        <iframe
          src={lab.embedUrl}
          className="w-full h-full border-none"
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
