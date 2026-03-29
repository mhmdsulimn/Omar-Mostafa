'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, Beaker, Library, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { LabExperiment, Student } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Page Header */}
      <div className="flex items-center gap-6">
        <div className="p-4 rounded-[2rem] bg-primary/10 border-2 border-primary/20 shadow-2xl animate-premium-icon">
          <FlaskConical className="h-10 w-10 text-primary" />
        </div>
        <div className="text-right">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">المعمل الافتراضي</h1>
          <p className="text-muted-foreground text-sm md:text-lg font-bold mt-2">
            استكشف الفيزياء عملياً من خلال تجارب PhET التفاعلية العالمية.
          </p>
        </div>
      </div>

      {!sortedLabs || sortedLabs.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/5 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center gap-6">
            <div className="p-8 rounded-full bg-muted/20 relative">
                <Library className="h-20 w-20 text-muted-foreground opacity-30" />
                <div className="absolute -top-2 -right-2 bg-primary text-white p-2 rounded-full animate-bounce">
                    <Sparkles className="h-6 w-6" />
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black">لا توجد تجارب متاحة حالياً</h3>
                <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                سيقوم الأستاذ عمر بإضافة تجارب معملية تناسب منهجك قريباً. ترقبوا التحديثات!
                </p>
            </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedLabs.map((lab, index) => (
            <Card
              key={lab.id}
              className="group relative overflow-hidden rounded-[2.5rem] border-primary/10 bg-card/50 backdrop-blur-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-slide-in-up border-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <CardHeader className="relative p-0 overflow-hidden">
                {/* Illustrative Header Area */}
                <div className="h-40 w-full bg-primary/5 flex items-center justify-center relative">
                  {/* Decorative Grid Pattern */}
                  <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  {/* Floating Icon with 3D shadow */}
                  <div className="relative z-10 p-5 rounded-[2rem] bg-background shadow-2xl border border-primary/10 transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
                    <Beaker className="h-12 w-12 text-primary" />
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-5 right-5 flex gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-4 py-1 rounded-full uppercase text-[10px] tracking-widest shadow-sm">عملي</Badge>
                    {lab.grade !== 'all' && (
                      <Badge variant="outline" className="bg-background/50 backdrop-blur-md font-black border-white/10 px-3 shadow-sm">
                        {gradeMap[lab.grade]}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 text-right space-y-4">
                <CardTitle className="text-2xl font-black line-clamp-1 group-hover:text-primary transition-colors tracking-tight">
                  {lab.title}
                </CardTitle>
                <p className="text-sm font-bold text-muted-foreground line-clamp-2 min-h-[48px] leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                  {lab.description || 'استكشف المفاهيم الفيزيائية بشكل تفاعلي وممتع من خلال هذه التجربة المعملية المتطورة.'}
                </p>
              </CardContent>

              <CardFooter className="p-8 pt-0">
                <Button
                  onClick={() => router.push(`/dashboard/labs/${lab.id}`)}
                  className="w-full h-14 text-xl font-black rounded-[1.5rem] gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all border-b-4 border-primary-shadow active:border-b-0 active:translate-y-1 active:scale-[0.98]"
                >
                  <Play className="h-6 w-6" />
                  بدء التجربة
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
