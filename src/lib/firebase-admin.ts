// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/* ─────────────────────────────
   🧠 Local vs Hosted Detection
───────────────────────────── */
const isServer = typeof window === 'undefined';
let app: admin.app.App | undefined;
let adminDb: Firestore | null = null;

/* ─────────────────────────────
   🔐 Load Credentials
   Priority:
   1. SERVICE_ACCOUNT_JSON (Vercel/Firebase env)
   2. GOOGLE_APPLICATION_CREDENTIALS (local JSON file path)
───────────────────────────── */
let serviceAccountString = process.env.SERVICE_ACCOUNT_JSON ?? null;

if (!serviceAccountString && isServer) {
  try {
    serviceAccountString = process.env.SERVICE_ACCOUNT_JSON ?? null;
  } catch {
    console.warn('⚠️ SERVICE_ACCOUNT_JSON not accessible (likely build stage)');
  }
}

try {
  if (!admin.apps.length) {
    if (serviceAccountString) {
      // Vercel-style stringified JSON in env var
      const credentials = JSON.parse(serviceAccountString);
      app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId:
          credentials.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin initialized via SERVICE_ACCOUNT_JSON');
    } else {
      // Fallback: local dev uses GOOGLE_APPLICATION_CREDENTIALS file
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('🧩 Firebase Admin initialized via applicationDefault()');
    }
  } else {
    app = admin.app();
    if (process.env.NODE_ENV === 'development') {
      console.log('🧩 Reusing existing Firebase Admin app');
    }
  }

  adminDb = getFirestore(app);
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
}

/* ─────────────────────────────
   ✅ Exports
───────────────────────────── */
export const dbAdmin: Firestore | null = adminDb;
export { admin, app };
export default app;

/**
 * ✅ Safe getter for SSR/API routes
 */
export function getAdminDb(): Firestore {
  if (!adminDb) throw new Error('Firebase Admin DB not initialized.');
  return adminDb;
}
