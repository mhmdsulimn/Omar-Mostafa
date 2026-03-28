import { LoadingAnimation } from '@/components/ui/loading-animation';

/**
 * صفحة التحميل الرئيسية للمنصة (Root Loading).
 * تضمن ظهور أنيميشن الـ 3D الفخم عند الانتقال بين المسارات الكبرى
 * مثل الانتقال من لوحة التحكم إلى صفحة تسجيل الدخول.
 */
export default function RootLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingAnimation size="lg" />
    </div>
  );
}
