import { DashboardLayout } from '@/components/dashboard-layout';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <DashboardLayout
      layoutType="admin"
    >
      {children}
    </DashboardLayout>
  );
}
