import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * ────────────────────────────────────────────────
 * 🧠 Firebase Admin Singleton Initialization
 * Works in both Vercel (serverless) and local dev.
 * Prevents duplicate initialization per cold start.
 * ────────────────────────────────────────────────
 */

let app: admin.app.App | undefined;
let db: Firestore | undefined;

/* ───────────────────────────────
   🔐 Load Credentials
─────────────────────────────── */
const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON ?? null;
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID;

/* ───────────────────────────────
   ⚙️ Initialize Firebase Admin
─────────────────────────────── */
function initFirebaseAdmin() {
  if (admin.apps.length) {
    // Already initialized
    app = admin.app();
    if (process.env.NODE_ENV === 'development') {
      console.log('🧩 Reusing existing Firebase Admin app');
    }
    return;
  }

  try {
    if (serviceAccountJson) {
      // ✅ Preferred: Vercel/Firebase env var with stringified JSON
      const credentials = JSON.parse(serviceAccountJson);
      app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || projectId,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Admin initialized via SERVICE_ACCOUNT_JSON');
      }
    } else {
      // 🧩 Fallback: use local GOOGLE_APPLICATION_CREDENTIALS file
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('🧩 Firebase Admin initialized via applicationDefault()');
      }
    }

    db = getFirestore(app);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

/* ───────────────────────────────
   🚀 Immediate Init (Safe Singleton)
─────────────────────────────── */
if (!admin.apps.length) {
  initFirebaseAdmin();
} else {
  app = admin.app();
  db = getFirestore(app);
}

/* ───────────────────────────────
   ✅ Safe Getters & Exports
─────────────────────────────── */
export { admin, app };

/** Firestore singleton instance */
export const dbAdmin: Firestore = db!;

/** Helper to ensure DB is always available */
export function getAdminDb(): Firestore {
  if (!db) {
    initFirebaseAdmin();
    db = getFirestore(admin.app());
  }
  return db;
}
