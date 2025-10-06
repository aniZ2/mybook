import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';
import algoliasearch, { type SearchClient, type SearchIndex } from 'algoliasearch';

// ─────────────────────────────
// 🔥 Firebase Initialization
// ─────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'us-central1');

// ─────────────────────────────
// 🔍 Algolia Initialization
// ─────────────────────────────
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!; 
const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'books';

let algoliaClient: SearchClient | null = null;
let algoliaIndex: SearchIndex | null = null;

if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) { // Changed condition for client safety
  algoliaClient = algoliasearch(
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_KEY // ONLY use the public search key here
  );
  algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
}

// ─────────────────────────────
// ✅ Required Guard Functions (Fixes the TypeError)
// ─────────────────────────────

/** Throws an error if the Firebase Auth service has not been initialized. */
export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error("Firebase Auth service is not initialized.");
  return auth; 
} 

/** Throws an error if the Firestore service has not been initialized. */
export function getDbOrThrow(): Firestore {
  if (!db) throw new Error("Firestore database is not initialized.");
  return db; 
} 

// ─────────────────────────────
// Exports
// ─────────────────────────────
export { app, algoliaClient, algoliaIndex };

export function getAlgoliaOrThrow(): SearchClient {
  if (!algoliaClient) throw new Error('Algolia client is not initialized');
  return algoliaClient;
}

export function getAlgoliaIndexOrThrow(): SearchIndex {
  if (!algoliaIndex) throw new Error('Algolia index is not initialized');
  return algoliaIndex;
}
