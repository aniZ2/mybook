// src/lib/firebase.ts
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
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize once (important for Next.js hot reload)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Correct modular service getters
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'us-central1');

// ─────────────────────────────
// 🔍 Algolia Initialization
// ─────────────────────────────
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? '';
const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? 'books';

let algoliaClient: SearchClient | null = null;
let algoliaIndex: SearchIndex | null = null;

if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
  algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
}

// ─────────────────────────────
// ✅ Safe Getters / Guards
// ─────────────────────────────
export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error('Firebase Auth service not initialized.');
  return auth;
}

export function getDbOrThrow(): Firestore {
  if (!db) throw new Error('Firestore not initialized.');
  return db;
}

export function getAlgoliaOrThrow(): SearchClient {
  if (!algoliaClient) throw new Error('Algolia client not initialized.');
  return algoliaClient;
}

export function getAlgoliaIndexOrThrow(): SearchIndex {
  if (!algoliaIndex) throw new Error('Algolia index not initialized.');
  return algoliaIndex;
}

// ─────────────────────────────
// 📦 Exports
// ─────────────────────────────
export { app, algoliaClient, algoliaIndex };
export default app;
