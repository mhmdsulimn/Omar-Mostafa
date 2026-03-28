'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { NotificationPermissionManager } from '@/components/common/NotificationPermissionManager';
import { SessionGuard } from '@/components/common/session-guard';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

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