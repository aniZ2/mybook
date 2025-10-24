'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import { updateReviewCache } from '@/app/actions/reviewActions'; // 👈 ADD THIS

export default function AddReview({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to leave a review.');
      return;
    }

    const db = getDbOrThrow();
    if (!db) return;

    setLoading(true);
    try {
      // 1. Add review to Firestore
      const docRef = await addDoc(collection(db, 'books', slug, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating,
        text,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Review added:', docRef.id);

      // 2. Update cache 👈 ADD THIS
      try {
        await updateReviewCache(slug, docRef.id);
        console.log('✅ Review cache updated - new review visible immediately!');
      } catch (cacheErr) {
        console.error('⚠️ Cache update failed (non-critical):', cacheErr);
        // Don't fail the whole operation if cache update fails
      }

      // 3. Reset form
      setText('');
      setRating(5);
      alert('Review submitted!');
      
      // 4. Reload the page to show new review
      window.location.reload();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: '1.5rem',
        display: 'grid',
        gap: '.75rem',
        maxWidth: '600px',
      }}
    >
      <h3 className="h2">Add your review</h3>

      <label>
        Rating:{' '}
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          disabled={loading}
          style={{ marginLeft: '.5rem' }}
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ★
            </option>
          ))}
        </select>
      </label>

      <textarea
        placeholder="Write your thoughts..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{
          resize: 'vertical',
          borderRadius: '.5rem',
          border: '1px solid #444',
          padding: '.75rem',
          background: '#111',
          color: '#fff',
        }}
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading || !text.trim()}
        style={{
          background: loading ? '#555' : '#FFD54F',
          color: loading ? '#999' : '#000',
          borderRadius: '.5rem',
          padding: '.5rem 1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
