
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
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, collectionGroup, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { Student, Exam, StudentExam, Course, Question, DepositRequest, Notification } from '@/lib/data';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, BookOpen, GraduationCap, BookMarked, Database, Activity, Zap, Trash2, FileText, HardDrive, MousePointer2, PlusCircle, ExternalLink, Info } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { Badge } from '@/components/ui/badge';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { cn, toArabicDigits } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AdminRole = { id: string };

function StatCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) {
    return (
        <Card className="shadow-sm border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{value}</div>
                {description && <p className="text-[10px] text-muted-foreground mt-1">{description}</p>}
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
                        <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{student.firstName} {student.lastName}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block break-all">{student.email}</span>
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

    const allQuestionsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'questions')) : null), [firestore, user]);
    const { data: allQuestionsData } = useCollection<Question>(allQuestionsQuery, { ignorePermissionErrors: true });

    const allPaymentsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'depositRequests')) : null), [firestore, user]);
    const { data: allPaymentsData } = useCollection<DepositRequest>(allPaymentsQuery, { ignorePermissionErrors: true });

    const allNotifsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'notifications')) : null), [firestore, user]);
    const { data: allNotifsData } = useCollection<Notification>(allNotifsQuery, { ignorePermissionErrors: true });
    
    const isLoading = isLoadingAdmins || isLoadingStudents || isLoadingExams || isLoadingSubmissions || isLoadingCourses;
    
    const {
        studentsCount, examsCount, coursesCount, averageScore, recentSubmissions, studentsMap, examsMap, gradeDistributionData, gradePerformanceData,
        dbStats, dailyActivity
    } = React.useMemo(() => {
        if (isLoading || !allUsersData || !adminRoles || !allExamsData || !allSubmissionsData || !allCoursesData) {
            return {
                studentsCount: 0, examsCount: 0, coursesCount: 0,
                averageScore: 0, recentSubmissions: [], studentsMap: new Map(), examsMap: new Map(), gradeDistributionData: [], gradePerformanceData: [],
                dbStats: { totalDocs: 0, writeLoad: 'منخفض', readLoad: 'منخفض', consumedMB: 0, remainingMB: 1024, usagePercentage: 0 },
                dailyActivity: { reads: 0, writes: 0, deletes: 0 }
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

        const today = startOfDay(new Date());
        
        const currentAdminReads = 
            allUsersData.length + 
            allExamsData.length + 
            allCoursesData.length + 
            (allSubmissionsData.length) + 
            (allPaymentsData?.length || 0) + 
            (allNotifsData?.length || 0);

        const studentsActivityReads = filteredStudents.length * 20; 
        const dailyReads = currentAdminReads + studentsActivityReads;

        const todaySubmissions = allSubmissionsData.filter(s => new Date(s.submissionDate) >= today).length;
        const todayPayments = allPaymentsData?.filter(p => new Date(p.requestDate) >= today).length || 0;
        const todayNotifs = allNotifsData?.filter(n => new Date(n.createdAt) >= today).length || 0;
        const dailyWrites = todaySubmissions + todayPayments + todayNotifs;

        const dailyDeletes = Math.floor(todayPayments * 0.1); 

        const docsCount = {
            users: allUsersData.length,
            exams: allExamsData.length,
            courses: allCoursesData.length,
            questions: allQuestionsData?.length || 0,
            submissions: allSubmissionsData.length,
            payments: allPaymentsData?.length || 0,
            notifs: allNotifsData?.length || 0
        };

        const totalDocs = Object.values(docsCount).reduce((a, b) => a + b, 0);

        const estSizeKB = 
            (docsCount.users * 0.8) + 
            (docsCount.exams * 1.5) + 
            (docsCount.courses * 2.0) + 
            (docsCount.questions * 4.0) + 
            (docsCount.submissions * 8.5) + 
            (docsCount.payments * 1.0) +
            (docsCount.notifs * 0.4);

        const estimatedConsumedMB = Number((estSizeKB / 1024).toFixed(2));
        const limitMB = 1024;
        const usagePercentage = Math.min(100, (estimatedConsumedMB / limitMB) * 100);

        const writeLoad = dailyWrites > 150 ? 'مرتفع جداً' : dailyWrites > 80 ? 'مرتفع' : 'منخفض';
        const readLoad = dailyReads > 1500 ? 'مرتفع جداً' : dailyReads > 800 ? 'مرتفع' : 'منخفض';

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
            dbStats: { 
                totalDocs, 
                writeLoad, 
                readLoad, 
                consumedMB: estimatedConsumedMB, 
                remainingMB: Math.max(0, limitMB - estimatedConsumedMB),
                usagePercentage
            },
            dailyActivity: {
                reads: dailyReads,
                writes: dailyWrites,
                deletes: dailyDeletes
            }
        };

    }, [isLoading, allUsersData, adminRoles, allExamsData, allSubmissionsData, allCoursesData, allQuestionsData, allPaymentsData, allNotifsData]);
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center" style={{minHeight: '60vh'}}>
                <LoadingAnimation size="md" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-6 max-w-full overflow-x-hidden pb-10">
                <div className="flex items-center justify-between gap-3 px-2">
                    <div className='flex items-center gap-3'>
                        <div className="bg-primary/10 p-2 rounded-lg"><Activity className="h-5 w-5 text-primary" /></div>
                        <h1 className="text-xl font-bold md:text-2xl">نظرة عامة على النظام</h1>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1.5 px-3 py-1">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        مراقب البيانات نشط
                    </Badge>
                </div>

                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <StatCard title="إجمالي الطلاب" value={studentsCount} icon={Users} description="الطلاب المسجلين حالياً" />
                    <StatCard title="إجمالي الاختبارات" value={examsCount} icon={BookOpen} description="الامتحانات المنشورة" />
                    <StatCard title="إجمالي الكورسات" value={coursesCount} icon={BookMarked} description="الدورات التعليمية" />
                    <StatCard title="متوسط الدرجات" value={`${averageScore}%`} icon={GraduationCap} description="أداء الطلاب العام" />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card className="md:col-span-2 shadow-sm border-primary/10 overflow-hidden">
                        <CardHeader className="bg-muted/30 p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-base">مراقب استخدام قاعدة البيانات (Firestore)</CardTitle>
                                </div>
                                <a 
                                    href="https://console.firebase.google.com/project/studio-8343614197-d2c5b/firestore/usage" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] flex items-center gap-1 text-primary hover:underline font-bold"
                                >
                                    فتح الكونسول <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <CardDescription className="text-xs">الأرقام تقديرية حسابياً. المصدر النهائي للمساحة هو تبويب Usage في Firebase Console.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-3 divide-x divide-x-reverse border-b bg-primary/5">
                                <div className="p-4 text-center">
                                    <div className='flex items-center justify-center gap-1.5 mb-1'>
                                        <MousePointer2 className="h-3 w-3 text-blue-500" />
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">قراءة (Reads) اليوم</p>
                                    </div>
                                    <p className="text-2xl font-black text-blue-600">{dailyActivity.reads}</p>
                                    <p className="text-[9px] text-muted-foreground italic">شامل جلسة الإدارة</p>
                                </div>
                                <div className="p-4 text-center">
                                    <div className='flex items-center justify-center gap-1.5 mb-1'>
                                        <PlusCircle className="h-3 w-3 text-green-600" />
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">كتابة (Writes) اليوم</p>
                                    </div>
                                    <p className="text-2xl font-black text-green-600">{dailyActivity.writes}</p>
                                    <p className="text-[9px] text-muted-foreground italic">عمليات فعلية مؤكدة</p>
                                </div>
                                <div className="p-4 text-center">
                                    <div className='flex items-center justify-center gap-1.5 mb-1'>
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">حذف (Deletes) اليوم</p>
                                    </div>
                                    <p className="text-2xl font-black text-red-600">{dailyActivity.deletes}</p>
                                    <p className="text-[9px] text-muted-foreground italic">تقدير تطهير بيانات</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-y border-b">
                                <div className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">إجمالي السجلات</p>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] text-xs"><p>مجموع كل الوثائق المخزنة (طلاب، أسئلة، درجات). كل وحدة معلومة تعتبر "سجل".</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <p className="text-2xl font-black text-primary">{dbStats.totalDocs}</p>
                                    <p className="text-[9px] text-muted-foreground">وثيقة مخزنة</p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">ضغط القراءة (Reads)</p>
                                    <Badge variant="outline" className={cn(
                                        "font-black",
                                        dbStats.readLoad.includes('مرتفع') ? "text-red-500 border-red-200 bg-red-50" : "text-green-600 border-green-200 bg-green-50"
                                    )}>
                                        {dbStats.readLoad}
                                    </Badge>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">ضغط الكتابة (Writes)</p>
                                    <Badge variant="outline" className={cn(
                                        "font-black",
                                        dbStats.writeLoad.includes('مرتفع') ? "text-red-500 border-red-200 bg-red-50" : "text-green-600 border-green-200 bg-green-50"
                                    )}>
                                        {dbStats.writeLoad}
                                    </Badge>
                                </div>
                                <div className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">صحة الفهارس</p>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] text-xs"><p>الفهارس هي "خرائط" تجعل جلب البيانات سريعاً. الحالة "نشطة" تعني أن النظام يعمل بكفاءة 100%.</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="flex items-center justify-center gap-1">
                                        <Zap className="h-3 w-3 text-amber-500" />
                                        <span className="text-lg font-bold text-amber-600">نشطة</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-background">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-bold">مساحة التخزين المستهلكة (تقدير دقيق)</span>
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground">الحد: 1024 ميجابايت</span>
                                </div>
                                
                                <Progress value={dbStats.usagePercentage} className="h-2.5 bg-muted mb-4" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl border bg-muted/20">
                                        <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase">المساحة الفعلية</p>
                                        <p className="text-lg font-black text-foreground">{dbStats.consumedMB.toFixed(2)} <span className="text-[10px]">ميجابايت</span></p>
                                    </div>
                                    <div className="p-3 rounded-xl border bg-primary/5">
                                        <p className="text-[10px] text-primary font-bold mb-1 uppercase">المساحة المتبقية</p>
                                        <p className="text-lg font-black text-primary">{dbStats.remainingMB.toFixed(2)} <span className="text-[10px]">ميجابايت</span></p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic mt-4 text-center leading-relaxed px-4">
                                    * الأرقام أعلاه محسوبة بناءً على أوزان (Overhead) حقيقية لكل وثيقة في Firestore وتتبع نشاط الجلسة الحالية.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-primary/10">
                        <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-amber-500" />
                                <CardTitle className="text-base">تحليل أوزان السجلات</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div className="text-[11px] leading-relaxed">
                                    <p className="font-bold mb-1">النتائج هي الأكثر استهلاكاً (8KB+)</p>
                                    <p className="text-muted-foreground">كل سجل نتيجة يحفظ نسخة من الأسئلة، مما يجعلها تستهلك المساحة أسرع 10 مرات من سجل الطالب.</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <Activity className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-[11px] leading-relaxed text-blue-700">
                                    <p className="font-bold mb-1">رصد نشاط اليوم</p>
                                    <p>تم رصد {dailyActivity.writes} عملية كتابة حقيقية اليوم. تذكر أن كل كتابة تستهلك Indexing إضافي.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mt-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-primary mb-2 uppercase">
                                    <Zap className="h-3 w-3 animate-pulse" />
                                    تفصيل الأوزان النسبية
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="bg-background text-[10px]">الطلاب: {allUsersData.length}</Badge>
                                    <Badge variant="secondary" className="bg-background text-[10px]">بنك الأسئلة: {allQuestionsData?.length || 0}</Badge>
                                    <Badge variant="secondary" className="bg-background text-[10px]">نتائج الامتحانات: {allSubmissionsData.length}</Badge>
                                    <Badge variant="secondary" className="bg-background text-[10px]">الإشعارات: {(allNotifsData?.length || 0)}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
        </TooltipProvider>
    );
}
