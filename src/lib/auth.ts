// src/lib/auth.ts
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthOrThrow, getDbOrThrow } from "@/lib/firebase";

const provider = new GoogleAuthProvider();

export async function startGoogleRedirect() {
  await signInWithRedirect(getAuthOrThrow(), provider);
}

export async function completeGoogleRedirect(): Promise<User | null> {
  const cred = await getRedirectResult(getAuthOrThrow());
  if (!cred) return null;
  const u = cred.user;
  await ensureUserDoc(u);
  return u;
}

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(getAuthOrThrow(), email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(getAuthOrThrow(), email, password);
  return cred.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(getAuthOrThrow(), email);
}

export async function logout() {
  return signOut(getAuthOrThrow());
}

// 🔑 Firestore profile helper
export async function ensureUserDoc(u: User) {
  if (!u) return;

  const db = getDbOrThrow();
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      role: "reader",
      isAuthor: false,
      profileComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
