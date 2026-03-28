'use server';

import 'server-only';
import { adminAuth, adminDb } from '@/firebase/admin-services';

/**
 * دالة مساعدة للتحقق من صلاحيات المسؤول
 */
async function verifyAdminStatus(token: string): Promise<void> {
  if (!token) throw new Error('لم يتم توفير رمز صلاحية.');

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminDoc = await adminDb.collection('roles_admin').doc(decodedToken.uid).get();
    
    if (!adminDoc.exists) {
      throw new Error('عذراً، ليس لديك صلاحيات المسؤول لتنفيذ هذا الإجراء.');
    }
  } catch (error: any) {
    console.error("Admin verification failed:", error);
    throw new Error(error.message || 'فشل التحقق من هوية المسؤول.');
  }
}

/**
 * حذف الكورس وجميع البيانات المرتبطة به تسلسلياً
 */
export async function deleteCourse(courseId: string, token: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await verifyAdminStatus(token);
    
    const courseRef = adminDb.collection('courses').doc(courseId);
    const batch = adminDb.batch();

    // 1. حذف المحاضرات والمحتويات
    const lecturesSnap = await courseRef.collection('lectures').get();
    for (const lectureDoc of lecturesSnap.docs) {
      const contentsSnap = await lectureDoc.ref.collection('contents').get();
      contentsSnap.docs.forEach(content => batch.delete(content.ref));
      batch.delete(lectureDoc.ref);
    }
    
    // 2. حذف اشتراكات الطلاب (باستخدام استعلام المجموعة)
    const enrollmentsSnap = await adminDb.collectionGroup('studentCourses')
      .where('courseId', '==', courseId)
      .get();
    
    for (const enrollmentDoc of enrollmentsSnap.docs) {
      // حذف سجلات التقدم داخل الاشتراك
      const progressSnap = await enrollmentDoc.ref.collection('progress').get();
      progressSnap.docs.forEach(p => batch.delete(p.ref));
      batch.delete(enrollmentDoc.ref);
    }

    // 3. حذف وثيقة الكورس الرئيسية
    batch.delete(courseRef);

    // تنفيذ جميع عمليات الحذف في معاملة واحدة (Batch)
    await batch.commit();

    return { success: true, message: 'تم حذف الكورس وجميع محتوياته واشتراكات الطلاب بنجاح.' };

  } catch (error: any) {
    console.error('Error deleting course:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع أثناء حذف الكورس.' };
  }
}
