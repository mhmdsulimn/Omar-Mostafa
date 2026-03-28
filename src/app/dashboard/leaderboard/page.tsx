'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, collectionGroup, doc } from 'firebase/firestore';
import type { Student, StudentExam, AppSettings } from '@/lib/data';
import { Loader2, Trophy } from 'lucide-react';
import { cn, toArabicDigits } from '@/lib/utils';

type LeaderboardEntry = {
  student: Student;
  totalPoints: number;
  rank: number;
};

type AdminRole = { id: string };

const gradeMap: Record<Student['grade'], string> = {
  first_secondary: '1ث',
  second_secondary: '2ث',
  third_secondary: '3ث',
};

const gradeTabs = [
    { id: 'all', label: 'كل الصفوف', shortLabel: 'الكل' },
    { id: 'first_secondary', label: 'الأول الثانوي', shortLabel: '1ث' },
    { id: 'second_secondary', label: 'الثاني الثانوي', shortLabel: '2ث' },
    { id: 'third_secondary', label: 'الثالث الثانوي', shortLabel: '3ث' },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="w-6 md:w-8 text-center text-sm md:text-lg font-bold text-muted-foreground">
        {toArabicDigits(String(rank))}
      </span>
    );
  }

  const config = {
    1: { medal: 'fill-yellow-400', ribbon: 'fill-blue-500', number: 'fill-black', medalStroke: 'stroke-yellow-500/50' },
    2: { medal: 'fill-slate-300', ribbon: 'fill-blue-500', number: 'fill-black', medalStroke: 'stroke-slate-400/50' },
    3: { medal: 'fill-amber-500', ribbon: 'fill-blue-500', number: 'fill-black', medalStroke: 'stroke-amber-600/50' },
  }[rank as 1 | 2 | 3];

  const starburstPath = React.useMemo(() => {
    const points = 16;
    const outerR = 15;
    const innerR = 14;
    const centerX = 24, centerY = 24;
    let path = 'M';
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        path += `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)} L`;
    }
    return path.slice(0, -2) + ' Z';
  }, []);

  return (
    <div className="relative h-10 w-10 md:h-12 md:w-12 shrink-0">
      <svg viewBox="0 0 48 52" className="absolute inset-0 drop-shadow-sm">
        <defs>
            <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.7"/>
            </filter>
        </defs>
        <path d="M18 28 L17 32 L24 30 L31 32 L30 28 Z" className={cn(config.ribbon)} />
        <path d={starburstPath} className={cn(config.medal, config.medalStroke)} strokeWidth="0.5" />
        <circle cx="24" cy="24" r="14" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.5" />
        <text
          x="24"
          y="26"
          dominantBaseline="middle"
          textAnchor="middle"
          className={cn('text-sm md:text-base font-black fill-black')}
          style={{ filter: 'url(#text-shadow)'}}
        >
          {toArabicDigits(String(rank))}
        </text>
      </svg>
    </div>
  );
}


const renderTable = (data: LeaderboardEntry[]) => {
    if (data.length === 0) {
      return (
        <div className="mt-4 rounded-xl border-2 border-dashed py-10 text-center text-muted-foreground mx-2">
          <p>لا توجد بيانات لعرضها في هذه الفئة.</p>
        </div>
      );
    }
    return (
      <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm mx-1 sm:mx-0">
        <div className="overflow-x-auto">
            <Table className="min-w-[320px]">
            <TableHeader className="bg-muted/30">
                <TableRow>
                <TableHead className="w-12 md:w-20 text-center px-2">الترتيب</TableHead>
                <TableHead className="px-3">الطالب</TableHead>
                <TableHead className="text-center px-2 hidden xs:table-cell">الصف</TableHead>
                <TableHead className="text-center px-3">النقاط</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(({ student, totalPoints, rank }) => (
                <TableRow key={student.id} className={cn(
                    "transition-colors hover:bg-muted/20",
                    rank === 1 && "bg-yellow-400/5",
                    rank === 2 && "bg-slate-400/5",
                    rank === 3 && "bg-orange-400/5"
                )}>
                    <TableCell className="text-center p-1.5 md:p-3">
                    <div className="flex justify-center">
                        <RankIcon rank={rank} />
                    </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                    <div className="flex flex-col">
                        <span className={cn(
                            "font-bold text-xs md:text-base line-clamp-1",
                            rank === 1 && 'text-yellow-600 dark:text-yellow-500',
                            rank === 2 && 'text-slate-600 dark:text-slate-400',
                            rank === 3 && 'text-orange-600 dark:text-orange-500'
                        )}>
                            {student.firstName} {student.lastName}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden">{gradeMap[student.grade]}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-center text-xs md:text-sm text-muted-foreground px-2 hidden xs:table-cell">{gradeMap[student.grade] || 'غير محدد'}</TableCell>
                    <TableCell className="text-center text-sm md:text-lg font-black px-3">{totalPoints}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </div>
    );
};

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [activeTab, setActiveTab] = React.useState('all');

  const settingsDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'settings', 'global') : null),
    [firestore, user]
  );
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsDocRef);
  
  const adminsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'roles_admin') : null), [firestore, user]);
  const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection<AdminRole>(adminsQuery);


  const allSubmissionsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'studentExams')) : null),
    [firestore, user]
  );
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<StudentExam>(allSubmissionsQuery);

  const allUsersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<Student>(allUsersQuery);

  const isLoading = isLoadingAdmins || isLoadingSubmissions || isLoadingUsers || isLoadingSettings;

  const leaderboards = React.useMemo(() => {
    if (isLoading || !allSubmissions || !allUsers || !adminRoles) {
      return { all: [], first_secondary: [], second_secondary: [], third_secondary: [] };
    }

    const studentMap = new Map(allUsers.map(user => [user.id, user]));
    const adminIds = new Set(adminRoles.map(r => r.id));
    const nonAdminUsers = allUsers.filter(user => !adminIds.has(user.id));
    const nonBannedStudents = nonAdminUsers.filter(u => !u.isBanned);

    const calculateLeaderboard = (filteredStudents: Student[]) => {
      const studentPoints = new Map<string, number>();
      const studentIdsInScope = new Set(filteredStudents.map(s => s.id));

      allSubmissions.forEach(submission => {
        if (studentIdsInScope.has(submission.studentId)) {
          const currentPoints = studentPoints.get(submission.studentId) || 0;
          studentPoints.set(submission.studentId, currentPoints + submission.achievedPoints);
        }
      });

      const rankedStudents: Omit<LeaderboardEntry, 'rank'>[] = [];
      studentPoints.forEach((totalPoints, studentId) => {
        const student = studentMap.get(studentId);
        if (student) {
          rankedStudents.push({ student, totalPoints });
        }
      });

      rankedStudents.sort((a, b) => b.totalPoints - a.totalPoints);
      
      return rankedStudents.map((entry, index) => ({
          ...entry,
          rank: index + 1,
      }));
    };

    return {
        all: calculateLeaderboard(nonBannedStudents),
        first_secondary: calculateLeaderboard(nonBannedStudents.filter(u => u.grade === 'first_secondary')),
        second_secondary: calculateLeaderboard(nonBannedStudents.filter(u => u.grade === 'second_secondary')),
        third_secondary: calculateLeaderboard(nonBannedStudents.filter(u => u.grade === 'third_secondary')),
    };

  }, [allSubmissions, allUsers, isLoading, adminRoles]);

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (appSettings?.isLeaderboardEnabled === false) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-center p-4">
        <Card className="p-8 animate-fade-in max-w-sm mx-auto rounded-2xl shadow-xl">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Trophy className="h-8 w-8 opacity-50" />
            </div>
            <CardTitle className="mt-4 text-xl">لوحة الصدارة غير متاحة</CardTitle>
            <CardDescription className="text-sm">
              عذرًا، قام المسؤول بإخفاء لوحة الصدارة في الوقت الحالي. حاول العودة لاحقاً.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2 px-2 md:px-0">
        <div className="bg-primary/10 p-2 rounded-xl">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-amber-500 shrink-0" />
        </div>
        <h1 className="text-xl font-bold md:text-2xl">لوحة الصدارة</h1>
      </div>
      <Card className="border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
        <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 text-center sm:text-right">
          <CardTitle className="text-lg md:text-xl">أفضل الطلاب أداءً</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            قائمة بالطلاب الأكثر حصولاً على النقاط في جميع الاختبارات.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
           <Tabs defaultValue="all" className="w-full" dir="rtl" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl mb-4">
                    {gradeTabs.map((tab) => (
                         <TabsTrigger key={tab.id} value={tab.id} className="py-2.5 text-[10px] sm:text-xs md:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.shortLabel}</span>
                         </TabsTrigger>
                    ))}
                </TabsList>
                {gradeTabs.map(tab => (
                     <TabsContent key={tab.id} value={tab.id} className="mt-0 focus-visible:outline-none">
                        {renderTable(leaderboards[tab.id as keyof typeof leaderboards])}
                     </TabsContent>
                ))}
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
