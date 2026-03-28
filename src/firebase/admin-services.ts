import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * @fileOverview تهيئة خدمات Firebase Admin.
 * تم تعديل التهيئة لتكون أكثر مرونة وتوافقاً مع بيئة التشغيل.
 */

const PROJECT_ID = 'studio-9564799523-9f92f';

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  
  // محاولة الحصول على التهيئة من متغيرات البيئة أو استخدام المعرف الثابت
  const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;

  return initializeApp({
    projectId: firebaseConfig?.projectId || PROJECT_ID,
  });
}

const adminApp = getAdminApp();

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
