
'use client';

import * as React from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { NotificationPermissionManager } from '@/components/common/NotificationPermissionManager';
import { SessionGuard } from '@/components/common/session-guard';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const firestore = useFirestore();

  // تحديث تاريخ آخر ظهور للطالب عند دخول لوحة التحكم
  React.useEffect(() => {
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { lastActiveAt: new Date().toISOString() });
    }
  }, [user?.uid, firestore]);

  return (
    <DashboardLayout
      layoutType="student"
    >
      <SessionGuard>
        <NotificationPermissionManager />
        {children}
      </SessionGuard>
    </DashboardLayout>
  );
}
