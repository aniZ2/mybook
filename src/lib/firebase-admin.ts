import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ─────────────────────────────
// 🧩 State
// ─────────────────────────────
let app: admin.app.App | undefined;
let adminDb: Firestore | null = null;

// ─────────────────────────────
// 🗝 Load credentials safely
// ─────────────────────────────
let serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;

if (!serviceAccountString && typeof process !== 'undefined' && process.env) {
  try {
    serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;
  } catch {
    console.warn('⚠️ SERVICE_ACCOUNT_JSON not accessible yet.');
  }
}

try {
  if (!admin.apps.length) {
    if (!serviceAccountString) {
      console.warn(
        '⚠️ Skipping Firebase Admin init — SERVICE_ACCOUNT_JSON not found (build stage).'
      );
    } else {
      const credentials = JSON.parse(serviceAccountString);
      app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      adminDb = getFirestore(app);
      console.log('✅ Firebase Admin initialized successfully');
    }
  } else {
    app = admin.app();
    adminDb = getFirestore(app);
    if (process.env.NODE_ENV === 'development') {
      console.log('🧩 Firebase Admin already initialized — reusing existing app.');
    }
  }
} catch (error) {
  console.error('❌ Failed to parse or initialize Firebase Admin SDK:', error);
}

// ─────────────────────────────
// ✅ Exports
// ─────────────────────────────
export const dbAdmin: Firestore | null = adminDb;
export { app, admin };
export default app;

/**
 * ✅ Safe runtime getter (for SSR routes)
 * Avoids `null` access when Firebase Admin hasn’t initialized yet.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    throw new Error('Firebase Admin DB not initialized.');
  }
  return adminDb;
}
