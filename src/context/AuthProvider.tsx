'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, getDbOrThrow } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserDoc, userConverter } from '@/types/firestore';

export const AuthContext = createContext<{
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(() => {
    // Load cached doc for instant UI on reload
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('userDoc');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserDoc(null);
        localStorage.removeItem('userDoc');
        setLoading(false);
        return;
      }

      // Real-time Firestore sync
      const db = getDbOrThrow();
      const ref = doc(db, 'users', firebaseUser.uid).withConverter(userConverter);

      const unsubUserDoc = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserDoc(data);
            // Cache safe data for instant reloads
            localStorage.setItem('userDoc', JSON.stringify(data));
          } else {
            setUserDoc(null);
            localStorage.removeItem('userDoc');
          }
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching user doc:', err);
          setUserDoc(null);
          setLoading(false);
        }
      );

      return () => unsubUserDoc();
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
