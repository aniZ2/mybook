// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;

// Try to initialize only if the env var exists
const serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (!serviceAccountString) {
    // 🩶 During Firebase App Hosting build, this often isn't injected yet.
    console.warn('⚠️ Skipping Firebase Admin init — SERVICE_ACCOUNT_JSON not found (build stage).');
  } else {
    try {
      const credentials = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      adminDb = getFirestore();
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to parse or initialize Firebase Admin SDK:', error);
    }
  }
}

// Always export (even if null) to prevent import crashes
export { adminDb, admin };
