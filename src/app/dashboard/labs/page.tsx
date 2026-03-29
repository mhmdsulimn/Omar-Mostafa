'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, Beaker, Library, Sparkles, MoveRight, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { LabExperiment, Student } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn, toArabicDigits } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';

const gradeMap: Record<string, string> = {
  all: 'كل الصفوف',
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
};

export default function StudentLabsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: studentData, isLoading: isStudentLoading } = useDoc<Student>(userDocRef);

  const labsQuery = useMemoFirebase(() => {
    if (!firestore || !studentData || !studentData.grade) return null;
    return query(
      collection(firestore, 'labs'),
      where('grade', 'in', ['all', studentData.grade])
    );
  }, [firestore, studentData?.grade]);

  const { data: labs, isLoading: isLabsLoading } = useCollection<LabExperiment>(labsQuery);

  const isLoading = isStudentLoading || isLabsLoading;

  const sortedLabs = React.useMemo(() => {
    if (!labs) return [];
    return [...labs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [labs]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <LoadingAnimation size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-10">
      {/* Page Header - Premium Style */}
      <div className="flex items-center gap-6 px-2">
        <div className="p-5 rounded-[2.2rem] bg-primary/10 border-2 border-primary/20 shadow-2xl shadow-primary/5 animate-premium-icon">
          <FlaskConical className="h-10 w-10 text-primary" />
        </div>
        <div className="text-right">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-foreground to-foreground/70">المعمل الافتراضي</h1>
          <p className="text-muted-foreground text-sm md:text-lg font-bold mt-2 opacity-80">
            استكشف المفاهيم الفيزيائية بشكل تفاعلي وممتع من خلال تجارب PhET المتطورة.
          </p>
        </div>
      </div>

      {!sortedLabs || sortedLabs.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/5 rounded-[3.5rem] py-32 flex flex-col items-center justify-center text-center gap-6 shadow-inner">
            <div className="p-10 rounded-full bg-muted/20 relative group">
                <Library className="h-24 w-24 text-muted-foreground opacity-20 transition-opacity group-hover:opacity-30" />
                <div className="absolute -top-2 -right-2 bg-primary text-white p-3 rounded-full animate-bounce shadow-xl">
                    <Sparkles className="h-6 w-6" />
                </div>
            </div>
            <div className="space-y-3 px-6">
                <h3 className="text-2xl md:text-3xl font-black">المعمل قيد التجهيز</h3>
                <p className="text-muted-foreground font-bold max-w-sm mx-auto leading-relaxed">
                سيقوم الأستاذ عمر بإضافة تجارب فيزيائية تفاعلية تناسب منهجك قريباً. ترقبوا الإشعارات!
                </p>
            </div>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-8 px-2">
          {sortedLabs.map((lab, index) => (
            <div key={lab.id} className="flex-1 min-w-[300px] sm:min-w-[350px] animate-slide-in-up" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
              <Card className="group relative overflow-hidden h-full rounded-[2.5rem] border-primary/10 bg-card/40 backdrop-blur-2xl hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_30px_60px_-12px_rgba(var(--primary),0.1)] transition-all duration-500 hover:-translate-y-2 border-2 flex flex-col">
                
                {/* Animated Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <CardHeader className="relative p-0 overflow-hidden shrink-0">
                  {/* Visual Header with Layered Gradients */}
                  <div className="h-40 w-full bg-gradient-to-b from-primary/10 to-transparent flex items-center justify-center relative">
                    {/* Digital Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    {/* Icon Hub with Glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse group-hover:bg-primary/30 transition-colors" />
                      <div className="relative z-10 p-5 rounded-[1.8rem] bg-background/80 backdrop-blur-md shadow-2xl border border-primary/10 transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                        <Beaker className="h-10 w-10 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                      </div>
                    </div>

                    {/* Top Level Badges */}
                    <div className="absolute top-5 right-5 flex flex-col items-end gap-2">
                      <Badge className="bg-primary/90 text-primary-foreground font-black px-3 py-1 rounded-full uppercase text-[9px] tracking-widest shadow-lg shadow-primary/20 backdrop-blur-sm border-none">عملي</Badge>
                      {lab.grade !== 'all' && (
                        <Badge variant="outline" className="bg-background/40 backdrop-blur-xl font-black border-white/10 px-3 text-[9px] shadow-sm">
                          {gradeMap[lab.grade]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 text-right space-y-4 flex-grow">
                  <CardTitle className="text-xl md:text-2xl font-black group-hover:text-primary transition-colors tracking-tight text-foreground/90">
                    {lab.title}
                  </CardTitle>
                  <div className="relative">
                      <p className="text-sm font-bold text-muted-foreground/80 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">
                        {lab.description || 'استكشف المفاهيم الفيزيائية بشكل تفاعلي وممتع من خلال هذه التجربة المعملية المتطورة من PhET.'}
                      </p>
                      <div className="absolute -right-3 top-0 w-1 h-full bg-primary/20 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                  </div>
                </CardContent>

                <div className="px-6 pb-2">
                   <div className="border-t border-primary/5 w-full"></div>
                </div>

                <CardFooter className="p-6 flex flex-col gap-4">
                  <div className="flex w-full justify-between items-center text-[10px] md:text-xs text-muted-foreground/60 font-bold">
                      <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{toArabicDigits(format(new Date(lab.createdAt), 'd MMMM yyyy', { locale: arSA }))}</span>
                      </div>
                      <span className="bg-muted/50 px-2 py-0.5 rounded-md">PhET Simulation</span>
                  </div>
                  
                  <Button
                    onClick={() => router.push(`/dashboard/labs/${lab.id}`)}
                    className="w-full h-12 text-lg font-black rounded-2xl gap-3 shadow-xl shadow-primary/10 hover:shadow-primary/30 transition-all border-b-4 border-primary-shadow active:border-b-0 active:translate-y-1 active:scale-[0.98] relative overflow-hidden group/btn"
                  >
                    <Play className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                    <span>بدء التجربة</span>
                    <MoveRight className="h-4 w-4 mr-auto opacity-0 -translate-x-4 group-hover/btn:opacity-50 group-hover/btn:translate-x-0 transition-all duration-500" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
