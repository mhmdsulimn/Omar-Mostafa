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
import { FlaskConical, Play, Beaker, Library, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { LabExperiment, Student } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn } from '@/lib/utils';

export default function StudentLabsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: studentData, isLoading: isStudentLoading } = useDoc<Student>(userDocRef);

  const labsQuery = useMemoFirebase(() => {
    // ننتظر حتى تتوفر بيانات الطالب تماماً
    if (!firestore || !studentData || !studentData.grade) return null;
    
    // تم تبسيط الاستعلام مؤقتاً لإزالة orderBy لضمان عدم حدوث خطأ بسبب الفهارس (Indexes)
    // ولتسهيل فحص الأذونات (Permissions)
    return query(
      collection(firestore, 'labs'),
      where('grade', 'in', ['all', studentData.grade])
    );
  }, [firestore, studentData?.grade]);

  const { data: labs, isLoading: isLabsLoading } = useCollection<LabExperiment>(labsQuery);

  const isLoading = isStudentLoading || isLabsLoading;

  // ترتيب المعامل يدوياً على الكلاينت لتجنب الحاجة لفهرس مركب (Composite Index)
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-4xl font-black">المعمل الافتراضي</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">
            استكشف الفيزياء عملياً من خلال تجارب PhET التفاعلية.
          </p>
        </div>
      </div>

      {!sortedLabs || sortedLabs.length === 0 ? (
        <Card className="border-dashed py-20">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <Library className="h-16 w-16 text-muted-foreground opacity-20" />
            <h3 className="text-xl font-bold">لا توجد تجارب متاحة حالياً</h3>
            <p className="text-muted-foreground max-w-xs">
              سيقوم الأستاذ عمر بإضافة تجارب معملية تناسب منهجك قريباً.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLabs.map((lab, index) => (
            <Card
              key={lab.id}
              className="group overflow-hidden rounded-[2rem] border-primary/10 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 animate-slide-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-background border border-primary/10">
                    <Beaker className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">عملي</Badge>
                </div>
                <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
                  {lab.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {lab.description || 'لا يوجد وصف متاح لهذه التجربة.'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  onClick={() => router.push(`/dashboard/labs/${lab.id}`)}
                  className="w-full h-12 font-bold rounded-xl gap-2"
                >
                  <Play className="h-4 w-4" />
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

function Badge({ children, className }: any) {
  return (
    <div className={cn("px-2 py-0.5 rounded-full text-xs font-bold border", className)}>
      {children}
    </div>
  );
}
