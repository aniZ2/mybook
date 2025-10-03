// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Build the Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Only initialize Firebase in the browser (avoid SSR invalid API key)
if (typeof window !== "undefined") {
  console.log("✅ Firebase config in browser:", firebaseConfig);

  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

// ✅ Helpers so you can safely access auth/db without TS errors
export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error("Firebase Auth not initialized (SSR?)");
  return auth;
}

export function getDbOrThrow(): Firestore {
  if (!db) throw new Error("Firestore not initialized (SSR?)");
  return db;
}
