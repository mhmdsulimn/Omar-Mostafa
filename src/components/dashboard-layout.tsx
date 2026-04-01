
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  LogOut,
  Menu,
  Settings,
  User,
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Shield,
  BookMarked,
  Wallet,
  Library,
  MessageSquareQuote,
  CreditCard,
  Bell,
  Trophy,
  HardHat,
  Bot,
  BrainCircuit,
  Headset,
  Wrench,
  FlaskConical,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from './common/logo';
import { ModeToggle } from './mode-toggle';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Skeleton } from './ui/skeleton';
import { useNavigationLoader } from '@/hooks/use-navigation-loader';
import type { Student, AppSettings, Notification, Announcement, DepositRequest } from '@/lib/data';
import { doc, collection, query, where, collectionGroup } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarHeader, SidebarFooter } from './ui/sidebar';
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { DeveloperInfoDialog } from './common/developer-info-dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from './ui/loading-animation';
import { ScrollArea } from './ui/scroll-area';

type NavItem = {
  href?: string;
  label: string;
  icon: React.ElementType;
  action?: () => void;
};

export function DashboardLayout({
  children,
  layoutType,
}: {
  children: React.ReactNode;
  layoutType: 'admin' | 'student';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [optimisticPath, setOptimisticPath] = React.useState<string | null>(null);
  const { startLoader, isLoading: isNavigating } = useNavigationLoader();
  
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  // Admin status check - Updated to match Firestore Rules (hardcoded emails/IDs + doc check)
  const adminDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'roles_admin', user.uid) : null),
    [user, firestore]
  );
  const { data: adminRole, isLoading: isCheckingAdmin } = useDoc(adminDocRef);
  
  const isAdmin = React.useMemo(() => {
    if (!user) return false;
    const adminEmails = ["mhmdsulimn.dev@gmail.com"];
    const adminIds = ["70vVkvBj0IQIwbxwdPaEAOj6LSu2"];
    return adminEmails.includes(user.email || '') || adminIds.includes(user.uid) || !!adminRole;
  }, [user, adminRole]);

  // Shared queries (Notifications)
  const notificationsQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, `users/${user.uid}/notifications`), where('isRead', '==', false)) : null,
    [user, firestore]
  );
  const { data: unreadNotifications } = useCollection<Notification>(notificationsQuery);

  // Student specific queries (Announcements)
  const announcementsQuery = useMemoFirebase(
    () => (firestore && studentData && layoutType === 'student') ? query(
      collection(firestore, 'announcements'),
      where('isActive', '==', true),
      where('targetGrade', 'in', ['all', studentData.grade])
    ) : null,
    [firestore, studentData, layoutType]
  );
  const { data: announcements } = useCollection<Announcement>(announcementsQuery);

  // Admin specific queries (Pending Payments)
  // We fetch ALL requests and filter in JS to avoid index requirement issues that might block the badge
  const allPaymentsQuery = useMemoFirebase(
    () => (firestore && user && layoutType === 'admin' && isAdmin) 
      ? query(collectionGroup(firestore, 'depositRequests')) 
      : null,
    [firestore, user, layoutType, isAdmin]
  );
  const { data: allPayments } = useCollection<DepositRequest>(allPaymentsQuery, { ignorePermissionErrors: true });
  
  const settingsDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'settings', 'global') : null),
    [firestore, user]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

  // Badge counting logic per item
  const getBadgeCount = (href: string) => {
    if (href === '/dashboard/notifications') {
      let count = unreadNotifications?.length || 0;
      if (layoutType === 'student' && announcements && studentData) {
        const unreadAnnouncements = announcements.filter(a => 
          !studentData.readAnnouncements?.includes(a.id)
        );
        count += unreadAnnouncements.length;
      }
      return count;
    }
    
    if (href === '/admin/dashboard/payments') {
      // Filter for 'pending' status in memory for maximum reliability
      return allPayments?.filter(p => p.status === 'pending').length || 0;
    }

    if (href === '/admin/dashboard/announcements') {
      return unreadNotifications?.length || 0;
    }

    return 0;
  };

  const studentNavItems: NavItem[] = [
      { href: '/dashboard/courses', label: 'تصفح الكورسات', icon: Library },
      { href: '/dashboard/exams', label: 'الاختبارات', icon: BookOpen },
      { href: '/dashboard/my-courses', label: 'كورساتي', icon: BookMarked },
      { href: '/dashboard/labs', label: 'المعمل', icon: FlaskConical },
      { href: '/dashboard/assistant', label: 'المساعد الذكي', icon: Bot },
      { href: '/dashboard/my-scores', label: 'درجاتي', icon: GraduationCap },
      { href: '/dashboard/leaderboard', label: 'لوحة الصدارة', icon: Trophy },
      { href: '/dashboard/notifications', label: 'الإشعارات', icon: Bell },
      { href: '/dashboard/wallet', label: 'المحفظة', icon: Wallet },
      { href: '/dashboard/support', label: 'الدعم الفني', icon: Headset },
  ].filter(item => {
    if (layoutType === 'student') {
        if (item.href === '/dashboard/leaderboard') {
            return appSettings?.isLeaderboardEnabled !== false;
        }
        if (item.href === '/dashboard/labs') {
            return appSettings?.isLabsEnabled !== false;
        }
    }
    return true;
  });
  
  const adminNavItems: NavItem[] = [
      { href: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
      { href: '/admin/dashboard/assistant', label: 'المساعد الإداري', icon: BrainCircuit },
      { href: '/admin/dashboard/courses', label: 'الكورسات', icon: BookMarked },
      { href: '/admin/dashboard/exams', label: 'الاختبارات', icon: BookOpen },
      { href: '/admin/dashboard/labs', label: 'المعمل', icon: FlaskConical },
      { href: '/admin/dashboard/students', label: 'الطلاب', icon: Users },
      { href: '/admin/dashboard/scores', label: 'الدرجات', icon: GraduationCap },
      { href: '/admin/dashboard/leaderboard', label: 'لوحة الصدارة', icon: Trophy },
      { href: '/admin/dashboard/payments', label: 'الدفع', icon: CreditCard },
      { href: '/admin/dashboard/tools', label: 'الأدوات', icon: Wrench },
      { href: '/admin/dashboard/admins', label: 'المسؤولون', icon: Shield },
      { href: '/admin/dashboard/announcements', label: 'الرسائل', icon: MessageSquareQuote },
  ];

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  React.useEffect(() => {
    if(!isUserLoading && !user){
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  React.useEffect(() => {
    if (isUserLoading || isCheckingAdmin || !user) return;

    if (layoutType === 'admin') {
      if (!isAdmin) {
        router.replace('/dashboard/courses');
      }
    } else if (layoutType === 'student') {
      if (isAdmin) {
        router.replace('/admin/dashboard');
      }
    }
  }, [isAdmin, isCheckingAdmin, isUserLoading, layoutType, router, user]);

  React.useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  const navItems = layoutType === 'admin' ? adminNavItems : studentNavItems;

  const handleLogout = async () => {
    if (!auth) return;
    try {
        startLoader(); 
        await signOut(auth);
        localStorage.removeItem('primary-color');
        localStorage.removeItem('exam_prep_session');
        router.replace('/login');
    } catch (error) {
        console.error("Logout failed", error);
        router.replace('/login');
    }
  };

  const isNavItemActive = (item: NavItem) => {
    if (!item.href) return false;
    const current = optimisticPath || pathname;
    if (item.href === '/admin/dashboard' || item.href === '/dashboard/exams') {
      return current === item.href;
    }
    return current.startsWith(item.href);
  };

  const handleNavClick = (href: string) => {
    if (pathname !== href) {
      setOptimisticPath(href); 
      startLoader(); 
    }
    setIsMobileMenuOpen(false);
  };
  
  const UserMenu = () => {
    const profilePath = layoutType === 'admin' ? '/admin/dashboard/profile' : '/dashboard/profile';
    const settingsPath = layoutType === 'admin' ? '/admin/dashboard/settings' : '/dashboard/settings';
    if (isUserLoading || !user) return <Skeleton className="h-9 w-9 rounded-full" />;
    return (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setOptimisticPath(profilePath); startLoader(); router.push(profilePath); }}>
            <User className="ml-2 h-4 w-4" />
            <span>الملف الشخصي</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setOptimisticPath(settingsPath); startLoader(); router.push(settingsPath); }}>
              <Settings className="ml-2 h-4 w-4" />
              <span>الإعدادات</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
             <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const BalanceDisplay = () => {
    if (layoutType !== 'student') return null;
    return (
      <Link href="/dashboard/wallet" onClick={() => handleNavClick('/dashboard/wallet')} className="group">
        <div className="flex items-center gap-2 rounded-full bg-muted/50 p-1 text-sm font-semibold transition-colors group-hover:bg-primary/10 backdrop-blur-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Wallet className="h-4 w-4" />
            </div>
           {isStudentDataLoading ? <Skeleton className="h-5 w-12" /> : <span className='px-1 whitespace-nowrap'>{studentData?.balance ?? 0} جنيه</span>}
        </div>
      </Link>
    );
  }
  
  if (!isMounted) return null;
  const isStudentInMaintenance = layoutType === 'student' && appSettings?.isMaintenanceMode;
  const isAuthorizing = layoutType === 'admin' && (isUserLoading || isCheckingAdmin);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen p-2 md:p-4 overflow-hidden bg-transparent">
        <div className="flex h-full w-full gap-2 md:gap-4 overflow-hidden">
          <Sidebar className="w-64 rounded-2xl shadow-lg overflow-hidden bg-sidebar/40 backdrop-blur-xl border border-sidebar-border hidden md:flex shrink-0">
            <SidebarHeader className="flex h-16 items-center justify-center shrink-0 px-4 py-2">
              <Logo width={110} height={38} />
            </SidebarHeader>
            <SidebarSeparator />
            <SidebarContent className="flex flex-col">
              <SidebarMenu className="flex-grow">
                {navItems.map((item) => {
                  const count = item.href ? getBadgeCount(item.href) : 0;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        as={item.href ? Link : "button"}
                        href={item.href}
                        onClick={item.href ? () => handleNavClick(item.href!) : item.action}
                        isActive={item.href ? isNavItemActive(item) : false}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                        {count > 0 && (
                          <span className="mr-auto h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground animate-in zoom-in-50 duration-300 shadow-sm shadow-destructive/20">
                            {count}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarSeparator />
            <SidebarFooter className="p-4 pt-2 text-center text-[10px] text-muted-foreground shrink-0">
              <DeveloperInfoDialog>
                <button className="hover:text-primary transition-colors focus:outline-none">
                  Developed by Mohamed Suliman
                </button>
              </DeveloperInfoDialog>
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-1 flex-col overflow-hidden gap-2 md:gap-4">
            <header className="flex h-14 shrink-0 items-center gap-2 md:gap-4 rounded-2xl border border-sidebar-border bg-sidebar/40 backdrop-blur-xl px-3 md:px-6 shadow-lg lg:h-[60px]">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0 md:hidden h-9 w-9">
                        <Menu className="h-5 w-5" />
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex flex-col p-0 w-[280px] overflow-hidden">
                      <SheetHeader className="sr-only">
                        <SheetTitle>قائمة التنقل</SheetTitle>
                        <SheetDescription>القائمة الجانبية للموبايل</SheetDescription>
                      </SheetHeader>
                      
                      <div className="flex h-16 items-center justify-center shrink-0 border-b bg-sidebar/5">
                          <Logo width={110} height={38} />
                      </div>

                      <ScrollArea className="flex-1 px-3 py-4">
                        <nav className="grid gap-1.5 text-lg font-medium" dir="rtl">
                          {navItems.map((item) => {
                            if (item.href) {
                                const count = getBadgeCount(item.href);
                                return (
                                  <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cn(
                                      'flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm transition-colors',
                                      isNavItemActive(item) ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                    onClick={() => handleNavClick(item.href!)}
                                  >
                                    <item.icon className="h-5 w-5" />
                                    <span className="flex-grow">{item.label}</span>
                                    {count > 0 && (
                                      <span className={cn(
                                          "h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-black shadow-sm",
                                          isNavItemActive(item) ? "bg-white text-primary" : "bg-destructive text-white shadow-destructive/20"
                                      )}>
                                        {count}
                                      </span>
                                    )}
                                  </Link>
                                );
                            }
                            return null;
                          })}
                        </nav>
                      </ScrollArea>

                      <div className="mt-auto p-4 text-center text-[10px] text-muted-foreground border-t bg-sidebar/5">
                        <DeveloperInfoDialog>
                          <button className="hover:text-primary transition-colors focus:outline-none">
                            Developed by Mohamed Suliman
                          </button>
                        </DeveloperInfoDialog>
                      </div>
                  </SheetContent>
              </Sheet>
              
              <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                <BalanceDisplay />
                {layoutType === 'admin' && appSettings?.isMaintenanceMode && (
                  <Badge variant="destructive" className="animate-pulse flex items-center gap-1 shadow-md border-white/20 whitespace-nowrap px-2 py-0.5 text-[10px] md:text-xs">
                    <HardHat className="h-3 w-3" />
                    <span className="hidden xs:inline">صيانة</span>
                  </Badge>
                )}
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <ModeToggle />
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-sidebar/30 backdrop-blur-xl rounded-2xl border border-sidebar-border p-3 md:p-6 shadow-lg">
              {isAuthorizing ? (
                <div className="flex h-full w-full items-center justify-center min-h-[400px]">
                  <LoadingAnimation size="md" />
                </div>
              ) : isStudentInMaintenance ? (
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden text-center p-4">
                  <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
                      <HardHat className="h-16 w-16 text-primary" />
                      <h1 className="text-2xl md:text-3xl font-bold">المنصة الآن قيد الصيانة</h1>
                      <p className="max-w-md text-muted-foreground text-sm md:text-base">نحن نعمل على تحسين تجربتك. ستعود المنصة للعمل قريبًا.</p>
                  </div>
                </div>
              ) : isNavigating ? (
                <div className="flex h-full w-full items-center justify-center min-h-[400px] animate-in fade-in duration-300">
                  <LoadingAnimation size="md" />
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
