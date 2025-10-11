// src/lib/firebase.ts
import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';
import algoliasearch, { type SearchClient, type SearchIndex } from 'algoliasearch';

// ─────────────────────────────
// 🌎 Environment Guard
// ─────────────────────────────
const isBrowser = typeof window !== 'undefined';

// ─────────────────────────────
// 🔥 Firebase Client SDK Initialization
// ─────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

// Initialize app
app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Only attach services in the browser
if (isBrowser) {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'us-central1');
}

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
// ✅ Safe Getters
// ─────────────────────────────
export function getDbOrThrow(): Firestore {
  if (!db) throw new Error('❌ Firestore not initialized.');
  return db;
}

export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error('❌ Firebase Auth not initialized.');
  return auth;
}

export function getStorageOrThrow(): FirebaseStorage {
  if (!storage) throw new Error('❌ Firebase Storage not initialized.');
  return storage;
}

export function getAlgoliaIndexOrThrow(): SearchIndex {
  if (!algoliaIndex) throw new Error('❌ Algolia index not initialized.');
  return algoliaIndex;
}

// ─────────────────────────────
// 📦 Exports
// ─────────────────────────────
export { app, auth, db, storage, functions, algoliaClient, algoliaIndex };
export default app;
