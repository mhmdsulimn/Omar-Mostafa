'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// تهيئة تطبيق فايربيز والتأكد من عدم التكرار
function initializeFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  } else {
    return getApp();
  }
}

const firebaseApp: FirebaseApp = initializeFirebaseApp();

// إنشاء نسخ الخدمات (Singletons)
const auth: Auth = getAuth(firebaseApp);
auth.languageCode = 'ar';
const firestore: Firestore = getFirestore(firebaseApp);

// تهيئة خدمة التخزين بشكل آمن جداً (لا تسبب توقف الموقع إذا كانت غير مفعلة)
let storage: FirebaseStorage | null = null;
try {
    storage = getStorage(firebaseApp);
} catch (e) {
    console.warn("Firebase Storage is not enabled in the console. Using fallback image hosting.");
}

// تهيئة خدمة الرسائل فقط في بيئة المتصفح
const messaging = typeof window !== 'undefined' ? getMessaging(firebaseApp) : null;

export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore,
    messaging,
    storage,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
