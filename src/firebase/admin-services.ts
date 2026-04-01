import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * @fileOverview تهيئة خدمات Firebase Admin.
 */

const PROJECT_ID = 'studio-8343614197-d2c5b';

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  
  return initializeApp({
    projectId: PROJECT_ID,
  });
}

const adminApp = getAdminApp();

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
