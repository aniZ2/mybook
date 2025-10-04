import { getApps, getApp, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";

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

// Core services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "us-central1"); // ✅ add this line

// ✅ Strongly typed helper wrappers
export function getAuthOrThrow(): Auth {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  return auth;
}

export function getDbOrThrow(): Firestore {
  if (!db) throw new Error("Firestore is not initialized");
  return db;
}

export function getStorageOrThrow(): FirebaseStorage {
  if (!storage) throw new Error("Firebase Storage is not initialized");
  return storage;
}

export function getFunctionsOrThrow(): Functions {
  if (!functions) throw new Error("Firebase Functions is not initialized");
  return functions;
}
