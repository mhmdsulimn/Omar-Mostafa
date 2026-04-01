import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * @fileOverview تهيئة خدمات Firebase Admin.
 * تم تحسين التهيئة لتدعم العمل على الاستضافات الخارجية عبر مفاتيح الخدمة (FIREBASE_SERVICE_ACCOUNT).
 */

const PROJECT_ID = 'studio-8343614197-d2c5b';

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  
  // محاولة الحصول على "مفتاح الخدمة" من متغير بيئة مخصص (للإشعارات الفورية)
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : null;

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: PROJECT_ID,
  });
}

const adminApp = getAdminApp();

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
