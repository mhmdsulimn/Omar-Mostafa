'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch, orderBy, arrayUnion } from 'firebase/firestore';
import type { Announcement, Notification as UserNotification, Student } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Megaphone, Wallet, CheckCheck, Trash2, Pin, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale/ar-SA';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/ui/loading-animation';


type CombinedNotification = {
  id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: 'announcement' | 'wallet' | 'general' | 'reward' | 'congratulation' | 'warning' | 'normal';
  source: 'announcement' | 'notification';
};

const iconMap: { [key: string]: React.ElementType } = {
  announcement: Megaphone,
  wallet: Wallet,
  reward: Wallet,
  general: Bell,
  normal: Bell,
  congratulation: Sparkles,
  warning: AlertTriangle,
};

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isMarking, setIsMarking] = React.useState(false);
  const [deleteDialogItem, setDeleteDialogItem] = React.useState<CombinedNotification | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: studentData, isLoading: isLoadingStudent } = useDoc<Student>(userDocRef);

  const announcementsQuery = useMemoFirebase(
    () => (firestore && studentData) ? query(
      collection(firestore, 'announcements'),
      where('isActive', '==', true),
      where('targetGrade', 'in', ['all', studentData.grade])
    ) : null,
    [firestore, studentData]
  );
  const { data: announcements, isLoading: isLoadingAnnouncements } = useCollection<Announcement>(announcementsQuery);

  const notificationsQuery = useMemoFirebase(
    () => (user && firestore) ? query(collection(firestore, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc')) : null,
    [user, firestore]
  );
  const { data: userNotifications, isLoading: isLoadingNotifications } = useCollection<UserNotification>(notificationsQuery);

  const isLoading = isLoadingStudent || isLoadingAnnouncements || isLoadingNotifications;

  const combinedNotifications = React.useMemo(() => {
    if (!studentData) return [];

    const activeAnnouncements = (announcements || []);

    const mappedAnnouncements: CombinedNotification[] = activeAnnouncements.map(a => ({
      id: a.id,
      message: a.message,
      createdAt: a.updatedAt,
      isRead: studentData.readAnnouncements?.includes(a.id) || false, 
      type: (a.type || 'announcement') as CombinedNotification['type'],
      source: 'announcement',
    }));

    const mappedNotifications: CombinedNotification[] = (userNotifications || []).map(n => ({
      id: n.id,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      type: n.type as CombinedNotification['type'],
      source: 'notification',
    }));

    return [...mappedAnnouncements, ...mappedNotifications].sort((a, b) => {
      if (a.source === 'announcement' && b.source === 'notification') return -1;
      if (a.source === 'notification' && b.source === 'announcement') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [announcements, userNotifications, studentData]);

  const unreadCount = combinedNotifications.filter(n => !n.isRead).length;

  const handleToggleRead = async (item: CombinedNotification) => {
    if (!firestore || !user) return;

    try {
      if (item.source === 'announcement') {
        await updateDocumentNonBlocking(userDocRef!, {
          readAnnouncements: arrayUnion(item.id)
        });
      } else {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, item.id);
        await updateDocumentNonBlocking(notifRef, { isRead: !item.isRead });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل التحديث' });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!firestore || !user || !combinedNotifications) return;

    const unread = combinedNotifications.filter(n => !n.isRead);
    if (unread.length === 0) {
      toast({ title: 'لا توجد إشعارات جديدة لتمييزها.' });
      return;
    }

    setIsMarking(true);
    const batch = writeBatch(firestore);
    
    const unreadAnnouncementIds = unread
      .filter(n => n.source === 'announcement')
      .map(n => n.id);

    if (unreadAnnouncementIds.length > 0) {
      const currentRead = studentData?.readAnnouncements || [];
      const updatedRead = Array.from(new Set([...currentRead, ...unreadAnnouncementIds]));
      batch.update(userDocRef!, { readAnnouncements: updatedRead });
    }

    unread.filter(n => n.source === 'notification').forEach(n => {
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, n.id);
      batch.update(notifRef, { isRead: true });
    });

    try {
      await batch.commit();
      toast({ title: 'تم تمييز الكل كمقروء.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل العملية' });
    } finally {
      setIsMarking(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!firestore || !user || !deleteDialogItem) return;
    if (deleteDialogItem.source === 'announcement') return;

    try {
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, deleteDialogItem.id);
      await deleteDocumentNonBlocking(notifRef);
      toast({ title: 'تم حذف الإشعار بنجاح.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل حذف الإشعار.' });
    } finally {
      setDeleteDialogItem(null);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!firestore || !user) return;

    const deletableNotifications = userNotifications || [];
    if (deletableNotifications.length === 0) {
      toast({ title: 'لا توجد إشعارات شخصية لحذفها.' });
      setIsDeleteAllDialogOpen(false);
      return;
    }

    setIsDeletingAll(true);
    const batch = writeBatch(firestore);
    
    deletableNotifications.forEach(n => {
      const notifRef = doc(firestore, `users/${user.uid}/notifications`, n.id);
      batch.delete(notifRef);
    });

    try {
      await batch.commit();
      toast({ title: 'تم مسح كافة الإشعارات الشخصية بنجاح.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'فشل حذف الإشعارات.' });
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-xl font-bold md:text-2xl">الإشعارات</h1>
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleMarkAllAsRead} 
              disabled={isMarking || unreadCount === 0} 
              size="sm"
              className="flex-1 sm:flex-none text-xs md:text-sm h-9"
            >
              {isMarking ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCheck className="ml-2 h-4 w-4" />}
              تمييز الكل كمقروء
            </Button>
             <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 sm:flex-none text-xs md:text-sm h-9"
                    disabled={isDeletingAll || (userNotifications?.length || 0) === 0}
                    onClick={() => setIsDeleteAllDialogOpen(true)}
                >
                    <Trash2 className="ml-2 h-4 w-4" />
                    مسح الإشعارات
                </Button>
                <AlertDialogContent className="rounded-2xl max-w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيتم حذف كافة الإشعارات الشخصية (رصيد، درجات، إلخ). لن يتم حذف الإعلانات العامة المثبتة.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isDeletingAll}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllNotifications} disabled={isDeletingAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeletingAll ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'تأكيد المسح'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Card className="border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl text-right">صندوق الوارد</CardTitle>
          <CardDescription className="text-xs md:text-sm text-right">هنا ستجد آخر الإعلانات الإدارية المثبتة وإشعاراتك الشخصية.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          {combinedNotifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed">
              <Bell className="mx-auto h-12 w-12 opacity-20" />
              <p className="mt-4 font-medium">لا توجد إشعارات حتى الآن.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {combinedNotifications.map(item => {
                const Icon = iconMap[item.type] || Bell;
                const isAnnouncement = item.source === 'announcement';
                
                return (
                  <div key={`${item.source}-${item.id}`} className={cn(
                    "relative flex items-start gap-3 md:gap-4 rounded-xl border p-3 md:p-4 transition-all hover:shadow-md cursor-pointer",
                    !item.isRead ? 'bg-primary/5 border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.05)]' : 'bg-muted/30 border-transparent opacity-80',
                    isAnnouncement && 'ring-1 ring-primary/10'
                  )} onClick={() => !item.isRead && handleToggleRead(item)}>
                    <div className={cn(
                      "flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full shadow-sm",
                      (item.type === 'announcement' || item.type === 'normal' || item.type === 'general') && 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
                      item.type === 'wallet' && 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
                      (item.type === 'reward' || item.type === 'congratulation') && 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
                      item.type === 'warning' && 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'
                    )}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <div className="flex-grow min-w-0 text-right">
                      {isAnnouncement && (
                        <div className="flex items-center justify-end gap-1.5 mb-1 text-primary">
                          <span className="text-[10px] font-bold uppercase tracking-wider">إعلان مثبت هام</span>
                          <Pin className="h-3 w-3 rotate-45" />
                        </div>
                      )}
                      <p className={cn(
                        "font-semibold text-sm md:text-base leading-relaxed text-foreground/90",
                        !item.isRead && "text-foreground font-black"
                      )}>{item.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        {!item.isRead && (
                            <Badge className="h-5 text-[10px] px-1.5 bg-primary/20 text-primary hover:bg-primary/30 border-none animate-pulse">جديد</Badge>
                        )}
                        <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                            <span>{format(new Date(item.createdAt), 'd MMMM yyyy', { locale: arSA })}</span>
                            <span className="opacity-50">•</span>
                            <span>{format(new Date(item.createdAt), 'h:mm a', { locale: arSA })}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        {!isAnnouncement && (
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); setDeleteDialogItem(item); }}
                          >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">حذف</span>
                          </Button>
                        )}
                        {!item.isRead && (
                             <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
                                onClick={(e) => { e.stopPropagation(); handleToggleRead(item); }}
                                title="تمييز كمقروء"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!deleteDialogItem} onOpenChange={(open) => !open && setDeleteDialogItem(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيؤدي هذا إلى حذف هذا التنبيه نهائياً من صندوق الوارد الخاص بك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNotification} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
