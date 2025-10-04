// src/lib/auth.ts
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuthOrThrow, getDbOrThrow } from "@/lib/firebase";

const provider = new GoogleAuthProvider();

// Google Sign-In (works for both signup and login)
export async function signInWithGoogle() {
  const auth = getAuthOrThrow();
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
}

// Email Signup
export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(getAuthOrThrow(), email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

// Email Sign-In
export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(getAuthOrThrow(), email, password);
  return cred.user;
}

// Password Reset
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(getAuthOrThrow(), email);
}

// Logout
export async function logout() {
  return signOut(getAuthOrThrow());
}

// Create user document if it doesn't exist
async function ensureUserDoc(u: User) {
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

// Check if user needs onboarding
export async function needsOnboarding(uid: string): Promise<boolean> {
  try {
    const db = getDbOrThrow();
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return true;
    
    const data = snap.data();
    return !data.profileComplete;
  } catch (err) {
    console.error("Error checking onboarding:", err);
    return true;
  }
}