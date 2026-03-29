'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import type { Student, DepositRequest } from '@/lib/data';
import { doc, collection, query, where } from 'firebase/firestore';
import { Loader2, Wallet, Clock } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';

export default function WalletPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const shineRef = React.useRef<HTMLDivElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  const pendingRequestsQuery = useMemoFirebase(
    () => {
      if (!user || !firestore || isUserLoading) return null;
      return query(
        collection(firestore, 'users', user.uid, 'depositRequests'),
        where('status', '==', 'pending')
      );
    },
    [user?.uid, firestore, isUserLoading]
  );
  
  const { data: rawPendingRequests } = useCollection<DepositRequest>(pendingRequestsQuery, { ignorePermissionErrors: true });

  const pendingRequests = React.useMemo(() => {
    if (!rawPendingRequests) return [];
    return [...rawPendingRequests].sort((a, b) => 
      new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
  }, [rawPendingRequests]);

  const isLoading = isUserLoading || isStudentDataLoading;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;
    
    // 3D Tilt calculation
    const rotateX = ((y / height) - 0.5) * -20;
    const rotateY = ((x / width) - 0.5) * 20;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // Interactive Shine calculation
    if (shineRef.current) {
      const px = (x / width) * 100;
      const py = (y / height) * 100;
      shineRef.current.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.3) 0%, transparent 60%)`;
      shineRef.current.style.opacity = '1';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
    if (shineRef.current) {
      shineRef.current.style.opacity = '0';
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="relative -mx-3 md:-mx-6 -mt-3 md:-mt-6 h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col items-center overflow-y-auto bg-background select-none transition-colors duration-500 pb-10">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Cinematic Background - Liquid Neon Style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Main Fluid Blobs */}
        <div className="absolute top-[10%] left-[5%] h-[25rem] w-[25rem] rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 opacity-20 dark:opacity-40 filter blur-[80px] animate-blob"></div>
        <div className="absolute bottom-[15%] right-[5%] h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-fuchsia-600 to-pink-400 opacity-15 dark:opacity-35 filter blur-[100px] animate-blob [animation-delay:-3s]"></div>
        <div className="absolute top-[40%] right-[10%] h-[20rem] w-[20rem] rounded-full bg-gradient-to-bl from-purple-700 to-indigo-500 opacity-15 dark:opacity-30 filter blur-[90px] animate-blob [animation-delay:-6s]"></div>
        
        {/* Decorative Hatching Elements */}
        <div className="absolute top-[25%] left-[10%] w-48 h-48 opacity-10 dark:opacity-20 rotate-12 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#06b6d4_10px,#06b6d4_11px)]"></div>
        <div className="absolute bottom-[20%] right-[15%] w-64 h-64 opacity-10 dark:opacity-15 -rotate-12 bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,#d946ef_10px,#d946ef_11px)]"></div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center p-6 gap-8 md:gap-10 shrink-0">
        <div className="w-full flex items-center justify-center mt-4">
          <h1 className="text-xl font-bold md:text-3xl text-foreground drop-shadow-lg tracking-tight">المحفظة الإلكترونية</h1>
        </div>

        <div className="w-full max-w-sm md:max-w-md mx-auto">
          <div 
            className="relative [perspective:1000px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            >
            <div 
              ref={cardRef}
              className={cn(
                "relative h-48 md:h-56 w-full rounded-2xl backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out z-10 overflow-hidden",
                "bg-white/70 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-6"
              )}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Shine Layer (Interactive Glare) */}
              <div 
                ref={shineRef}
                className="absolute inset-0 z-20 pointer-events-none opacity-0 transition-opacity duration-300 rounded-2xl"
              />

              <div className="absolute top-6 left-6 z-10">
                  <Logo width={70} height={22} />
              </div>

              <div className="absolute top-6 right-6 text-right z-10">
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/60 font-medium">اسم الطالب</p>
                  <p className="font-bold text-sm md:text-lg tracking-wider uppercase truncate max-w-[150px] md:max-w-[200px]">
                    {studentData?.firstName} {studentData?.lastName}
                  </p>
              </div>
              
              <div className="absolute left-6 top-[55%] -translate-y-1/2 z-10">
                <div className="h-8 w-12 md:h-10 md:w-14 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-600 opacity-90 shadow-[0_0_15px_rgba(234,179,8,0.2)] dark:shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-black/5 dark:border-white/10"></div>
              </div>

              <div className="absolute bottom-6 right-6 text-right z-10">
                  <p className="text-xs md:sm text-slate-500 dark:text-white/60 font-medium">الرصيد الحالي</p>
                  <div className="text-3xl md:text-5xl font-black tracking-wider flex items-baseline justify-end gap-1">
                      {studentData?.balance?.toFixed(0) || '0'}
                      <span className="text-sm md:text-2xl font-normal opacity-70">جنيه</span>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm md:max-w-md mx-auto">
            <button
                className="w-full h-12 md:h-14 text-lg md:text-xl font-bold rounded-xl shadow-2xl transition-transform transform active:translate-y-px border-b-4 border-primary-shadow active:border-b-2 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                onClick={() => router.push('/dashboard/wallet/charge')}
            >
                <Wallet className="h-5 w-5 md:h-6 md:w-6" />
                شحن الرصيد
            </button>
        </div>

        {pendingRequests && pendingRequests.length > 0 && (
          <div className="w-full max-w-2xl mx-auto animate-fade-in px-2 md:px-0">
            <div className="rounded-2xl backdrop-blur-2xl border border-border dark:border-white/10 bg-card dark:bg-white/5 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-border dark:border-white/10 bg-muted/30 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground dark:text-white">عمليات شحن قيد الانتظار</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/20 dark:bg-white/5">
                    <TableRow className="hover:bg-transparent border-border dark:border-white/10">
                      <TableHead className="text-right text-xs font-bold text-foreground/70 dark:text-white/70">المبلغ</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground/70 dark:text-white/70">الرقم المرسل</TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground/70 dark:text-white/70">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/50 dark:hover:bg-white/5 border-border dark:border-white/5 transition-colors">
                        <TableCell className="font-bold py-4 text-foreground dark:text-white">
                          {req.amount} جنيه
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 dark:text-white/80">{req.senderPhoneNumber}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground dark:text-white/60">
                          {format(new Date(req.requestDate), 'd MMM yyyy', { locale: arSA })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
