// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Environment variable containing the Service Account JSON string
const serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;

let adminDb: Firestore;

if (!admin.apps.length) {
  if (!serviceAccountString) {
    throw new Error('SERVICE_ACCOUNT_JSON environment variable is not set. Cannot initialize Admin SDK.');
  }
  
  try {
    const credentials = JSON.parse(serviceAccountString);

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  } catch (error) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', error);
    throw new Error('Invalid Firebase Admin credentials format. Check SERVICE_ACCOUNT_JSON content.');
  }
}

adminDb = getFirestore();

// ✅ CORRECT EXPORT: Explicitly export both adminDb and the admin namespace
export { adminDb, admin };