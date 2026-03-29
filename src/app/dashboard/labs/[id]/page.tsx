
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
import { ArrowLeft, Maximize, FlaskConical, AlertCircle, Info } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LabExperiment } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn } from '@/lib/utils';

export default function LabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params.id as string;
  const firestore = useFirestore();
  const containerRef = React.useRef<HTMLDivElement>(null);

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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-xl px-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          رجوع للمعمل
        </Button>
        <div className="flex-1 text-center md:text-right">
          <h1 className="text-xl md:text-3xl font-black truncate">{lab.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Iframe Container */}
        <div className="lg:col-span-3 space-y-4">
          <div 
            ref={containerRef}
            className="relative aspect-video w-full rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-2xl bg-black group"
          >
            <iframe
              src={lab.embedUrl}
              className="w-full h-full border-none"
              allowFullScreen
              title={lab.title}
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70 backdrop-blur-md rounded-xl"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              هذه التجربة مقدمة من موقع <span className="font-bold text-primary">PhET Interactive Simulations</span> بجامعة كولورادو بولدر. يمكنك التفاعل مع كافة العناصر في الشاشة.
            </p>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-primary/10 shadow-lg bg-card/50 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                دليل التجربة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {lab.description || 'لا توجد تعليمات إضافية لهذه التجربة.'}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-primary/10 shadow-lg bg-primary/5 border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-xs font-bold text-primary uppercase">نصيحة تسلا</p>
              <p className="text-sm font-bold">جرب تغيير المتغيرات وراقب الرسم البياني لتفهم العلاقة الفيزيائية بعمق! 🚀</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
