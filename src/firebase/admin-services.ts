
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * @fileOverview تهيئة خدمات Firebase Admin.
 * تم تحسين التهيئة لتدعم العمل على الاستضافات الخارجية عبر مفاتيح الخدمة.
 */

const PROJECT_ID = 'studio-8343614197-d2c5b';

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  
  // 1. محاولة الحصول على التهيئة من متغيرات البيئة (خاصة بـ App Hosting)
  const firebaseConfigEnv = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;

  // 2. محاولة الحصول على "مفتاح الخدمة" من متغير بيئة مخصص (للإشعارات على الاستضافات الخارجية)
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : null;

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: firebaseConfigEnv?.projectId || PROJECT_ID,
  });
}

const adminApp = getAdminApp();

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
