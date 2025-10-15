'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import type { ReviewDoc } from '@/types/firestore';

export default function AddReview({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      alert('Rating must be 1–5');
      return;
    }
    
    if (!db) {
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
        placeholder={user ? 'Share your thoughts…' : 'Sign in to review'}
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={!user || busy}
        rows={4}
        style={{ marginTop: '.6rem' }}
      />
      <button
        className="btn btn-primary"
        disabled={!user || busy || rating === 0}
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
