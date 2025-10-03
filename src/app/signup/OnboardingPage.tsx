'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function handleChoice(role: 'author' | 'reader') {
    if (!user) return;
    const db = getDbOrThrow();
    await setDoc(doc(db, 'users', user.uid), {
      role,
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Redirect immediately
    router.push(role === 'author' ? '/author' : '/reader');
  }

  if (loading || !user) return <p className="muted">Loading…</p>;

  return (
    <main className="onboard-container">
      <div className="onboard-card">
        <h1 className="h1">Welcome to Booklyverse</h1>
        <p className="muted">Choose your path to unlock your experience.</p>

        <div className="onboard-options">
          <button className="onboard-btn author" onClick={() => handleChoice('author')}>
            <h2>📚 I’m an Author</h2>
            <p>Publish books, grow your following, and connect with readers.</p>
          </button>
          <button className="onboard-btn reader" onClick={() => handleChoice('reader')}>
            <h2>👓 I’m a Reader</h2>
            <p>Discover books, join clubs, and follow your favorite authors.</p>
          </button>
        </div>
      </div>
    </main>
  );
}
