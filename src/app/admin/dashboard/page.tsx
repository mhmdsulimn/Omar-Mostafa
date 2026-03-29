
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import type { Student, Exam, StudentExam, Course } from '@/lib/data';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, BookOpen, GraduationCap, BookMarked } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Badge } from '@/components/ui/badge';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LoadingAnimation } from '@/components/ui/loading-animation';

type AdminRole = { id: string };

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

function RecentScoreRow({ submission, studentsMap, examsMap }: { submission: StudentExam, studentsMap: Map<string, Student>, examsMap: Map<string, Exam> }) {
    const student = studentsMap.get(submission.studentId);
    const exam = examsMap.get(submission.examId);

    if (!student || !exam) {
        return null;
    }

    return (
        <TableRow>
            <TableCell className="px-2 py-3 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarFallback>{student.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                        <span className="font-medium text-xs sm:text-sm line-clamp-1">{student.firstName} {student.lastName}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block truncate max-w-[100px] sm:max-w-none">{student.email}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-2 py-3 sm:px-4 text-xs sm:text-sm max-w-[150px] truncate">{exam.title}</TableCell>
            <TableCell className="px-2 py-3 sm:px-4 text-center">
                <Badge variant={submission.score >= 70 ? 'default' : 'destructive'} className="text-[10px] sm:text-xs px-1 sm:px-2">
                    {`${submission.score}%`}
                </Badge>
            </TableCell>
            <TableCell className="px-2 py-3 sm:px-4 text-center">
                <div className="flex flex-col text-[10px] sm:text-xs whitespace-nowrap">
                    <span>{format(new Date(submission.submissionDate), 'd/MM/yyyy', { locale: arSA })}</span>
                    <span className="text-muted-foreground hidden sm:inline">{format(new Date(submission.submissionDate), 'h:mm a', { locale: arSA })}</span>
                </div>
            </TableCell>
        </TableRow>
    );
}

const gradeDistributionChartConfig = {
  count: { label: "الطلاب" },
  first_secondary: { label: "أولى ثانوي", color: "#2563EB" },
  second_secondary: { label: "ثانية ثانوي", color: "#16A34A" },
  third_secondary: { label: "ثالثة ثانوي", color: "#DC2626" },
} satisfies ChartConfig;

const gradePerformanceChartConfig = {
  averageScore: { label: "متوسط الدرجة", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const adminsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'roles_admin') : null), [firestore, user]);
    const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection<AdminRole>(adminsQuery, { ignorePermissionErrors: true });

    const allUsersQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'users') : null), [firestore, user]);
    const { data: allUsersData, isLoading: isLoadingStudents } = useCollection<Student>(allUsersQuery, { ignorePermissionErrors: true });
    
    const allExamsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'exams') : null), [firestore, user]);
    const { data: allExamsData, isLoading: isLoadingExams } = useCollection<Exam>(allExamsQuery, { ignorePermissionErrors: true });

    const allSubmissionsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'studentExams')) : null), [firestore, user]);
    const { data: allSubmissionsData, isLoading: isLoadingSubmissions } = useCollection<StudentExam>(allSubmissionsQuery, { ignorePermissionErrors: true });
    
    const allCoursesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'courses') : null), [firestore, user]);
    const { data: allCoursesData, isLoading: isLoadingCourses } = useCollection<Course>(allCoursesQuery, { ignorePermissionErrors: true });
    
    const isLoading = isLoadingAdmins || isLoadingStudents || isLoadingExams || isLoadingSubmissions || isLoadingCourses;
    
    const {
        studentsCount, examsCount, coursesCount, averageScore, recentSubmissions, studentsMap, examsMap, gradeDistributionData, gradePerformanceData,
    } = React.useMemo(() => {
        if (isLoading || !allUsersData || !adminRoles || !allExamsData || !allSubmissionsData || !allCoursesData) {
            return {
                studentsCount: 0, examsCount: 0, coursesCount: 0,
                averageScore: 0, recentSubmissions: [], studentsMap: new Map(), examsMap: new Map(), gradeDistributionData: [], gradePerformanceData: []
            };
        }

        const adminIds = new Set(adminRoles.map(r => r.id));
        const filteredStudents = allUsersData.filter(user => !adminIds.has(user.id));
        
        const totalScore = allSubmissionsData.reduce((acc, sub) => acc + sub.score, 0);
        const avgScore = allSubmissionsData.length > 0 ? Math.round(totalScore / allSubmissionsData.length) : 0;
        
        const sortedSubmissions = [...allSubmissionsData].sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
        
        const sMap = new Map(allUsersData.map(user => [user.id, user]));
        const eMap = new Map(allExamsData.map(exam => [exam.id, exam]));
        
         const gradeCounts = filteredStudents.reduce((acc, student) => {
            if (student.grade) {
                acc[student.grade] = (acc[student.grade] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const gradeData = [
            { name: 'أولى ثانوي', grade: 'first_secondary', count: gradeCounts['first_secondary'] || 0, fill: "var(--color-first_secondary)" },
            { name: 'ثانية ثانوي', grade: 'second_secondary', count: gradeCounts['second_secondary'] || 0, fill: "var(--color-second_secondary)" },
            { name: 'ثالثة ثانوي', grade: 'third_secondary', count: gradeCounts['third_secondary'] || 0, fill: "var(--color-third_secondary)" },
        ].filter(item => item.count > 0);

        const studentGradeMap = new Map(allUsersData.map(u => [u.id, u.grade]));
        const gradePerformance: Record<string, { totalScore: number, count: number }> = {
            first_secondary: { totalScore: 0, count: 0 },
            second_secondary: { totalScore: 0, count: 0 },
            third_secondary: { totalScore: 0, count: 0 },
        };

        allSubmissionsData.forEach(submission => {
            const grade = studentGradeMap.get(submission.studentId);
            if (grade && gradePerformance[grade]) {
                gradePerformance[grade].totalScore += submission.score;
                gradePerformance[grade].count += 1;
            }
        });

        const performanceData = [
            { name: 'أولى ثانوي', averageScore: gradePerformance.first_secondary.count > 0 ? Math.round(gradePerformance.first_secondary.totalScore / gradePerformance.first_secondary.count) : 0 },
            { name: 'ثانية ثانوي', averageScore: gradePerformance.second_secondary.count > 0 ? Math.round(gradePerformance.second_secondary.totalScore / gradePerformance.second_secondary.count) : 0 },
            { name: 'ثالثة ثانوي', averageScore: gradePerformance.third_secondary.count > 0 ? Math.round(gradePerformance.third_secondary.totalScore / gradePerformance.third_secondary.count) : 0 },
        ].filter(item => item.averageScore > 0);

        return {
            studentsCount: filteredStudents.length,
            examsCount: allExamsData.length,
            coursesCount: allCoursesData.length,
            averageScore: avgScore,
            recentSubmissions: sortedSubmissions.slice(0, 20),
            studentsMap: sMap,
            examsMap: eMap,
            gradeDistributionData: gradeData,
            gradePerformanceData: performanceData,
        };

    }, [isLoading, allUsersData, adminRoles, allExamsData, allSubmissionsData, allCoursesData]);
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center" style={{minHeight: '60vh'}}>
                <LoadingAnimation size="md" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-full overflow-x-hidden">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard title="إجمالي الطلاب" value={studentsCount} icon={Users} />
                <StatCard title="إجمالي الاختبارات" value={examsCount} icon={BookOpen} />
                <StatCard title="إجمالي الكورسات" value={coursesCount} icon={BookMarked} />
                <StatCard title="متوسط الدرجات" value={`${averageScore}%`} icon={GraduationCap} />
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                 <Card className="shadow-sm">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">توزيع الطلاب على الصفوف</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">توزيع الطلاب المسجلين على الصفوف الدراسية.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-2 sm:p-6 pt-0">
                        {gradeDistributionData.length === 0 ? (
                           <div className="flex items-center justify-center h-[250px] sm:h-[350px] text-muted-foreground text-sm italic">لا يوجد طلاب مسجلون.</div>
                        ) : (
                            <ChartContainer config={gradeDistributionChartConfig} className="mx-auto aspect-square w-full h-[300px] sm:h-[350px]">
                                <PieChart>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Pie data={gradeDistributionData} dataKey="count" nameKey="name" innerRadius={55} strokeWidth={5}>
                                    {gradeDistributionData.map((entry) => (
                                        <Cell key={entry.grade} fill={entry.fill} />
                                    ))}
                                    </Pie>
                                    <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-4 flex-wrap gap-2 text-[10px] sm:text-xs [&>*]:basis-1/4 [&>*]:justify-center" />
                                </PieChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">أداء الطلاب حسب الصف الدراسي</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">متوسط الدرجات لكل صف دراسي.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6 pt-0">
                         {gradePerformanceData.length === 0 ? (
                            <div className="flex items-center justify-center h-[250px] sm:h-[350px] text-muted-foreground text-sm italic">لا توجد بيانات أداء لعرضها.</div>
                        ) : (
                        <ChartContainer config={gradePerformanceChartConfig} className="w-full h-[300px] sm:h-[350px]">
                            <BarChart data={gradePerformanceData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tick={{fontSize: 10}} />
                                <YAxis unit="%" tick={{fontSize: 10}} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={6} barSize={40} />
                            </BarChart>
                        </ChartContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="w-full">
                <Card className="w-full shadow-sm">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">آخر التقديمات</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">عرض آخر نتائج الاختبارات التي تم تقديمها (حتى 20 نتيجة).</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 pt-0">
                         {recentSubmissions.length === 0 ? (
                           <div className="text-center py-10 text-muted-foreground text-sm italic">لا توجد تقديمات بعد.</div>
                        ) : (
                            <div className="w-full overflow-x-auto rounded-lg border">
                                <div className="min-w-[700px]">
                                    <div className="max-h-[450px] overflow-y-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="text-[10px] sm:text-xs">الطالب</TableHead>
                                                    <TableHead className="text-[10px] sm:text-xs">الاختبار</TableHead>
                                                    <TableHead className="text-center text-[10px] sm:text-xs">الدرجة</TableHead>
                                                    <TableHead className="text-center text-[10px] sm:text-xs">التاريخ</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentSubmissions.map((sub) => (
                                                    <RecentScoreRow key={sub.id} submission={sub} studentsMap={studentsMap} examsMap={examsMap} />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
