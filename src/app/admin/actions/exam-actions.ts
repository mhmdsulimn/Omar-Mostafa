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
 * حذف الاختبار والأسئلة ونتائج الطلاب
 */
export async function deleteExam(examId: string, token: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    await verifyAdminStatus(token);
    
    const examRef = adminDb.collection('exams').doc(examId);
    const batch = adminDb.batch();

    // 1. حذف الأسئلة
    const questionsSnap = await examRef.collection('questions').get();
    questionsSnap.docs.forEach(q => batch.delete(q.ref));

    // 2. حذف تقديمات الطلاب (StudentExams)
    const submissionsSnap = await adminDb.collectionGroup('studentExams')
      .where('examId', '==', examId)
      .get();
    
    submissionsSnap.docs.forEach(s => batch.delete(s.ref));

    // 3. حذف الاختبار نفسه
    batch.delete(examRef);

    await batch.commit();

    return { success: true, message: 'تم حذف الاختبار وجميع أسئلته ونتائج الطلاب بنجاح.' };

  } catch (error: any) {
    console.error('Error deleting exam:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع أثناء حذف الاختبار.' };
  }
}
