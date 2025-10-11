'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider'; // ✅ Import useAuth
import type { ReviewDoc } from '@/types/firestore';

export default function AddReview({ slug }: { slug: string }) {
  const { user } = useAuth(); // ✅ Get user from context
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const signedIn = !!user;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn || !user) { // ✅ Add user check
      alert('Please sign in to review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      alert('Rating must be 1–5');
      return;
    }
    
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    setBusy(true);
    try {
      const review: Omit<ReviewDoc, 'id'> = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating,
        text,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'books', slug, 'reviews'), review);

      setRating(0);
      setText('');
      alert('Review posted successfully! ✅');
    } catch (error) {
      console.error('Error posting review:', error);
      alert('Failed to post review. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
        <label className="muted">Your rating:</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <textarea
        className="input"
        placeholder={signedIn ? 'Share your thoughts…' : 'Sign in to review'}
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={!signedIn || busy}
        rows={4}
        style={{ marginTop: '.6rem' }}
      />
      <button
        className="btn btn-primary"
        disabled={!signedIn || busy || rating === 0}
        style={{ marginTop: '.6rem' }}
      >
        {busy ? 'Posting…' : 'Post review'}
      </button>
    </form>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="btn"
          style={{
            padding: '.2rem .4rem',
            marginRight: '.2rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}