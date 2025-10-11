'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ReviewDoc } from '@/types/firestore';

export default function ReviewsList({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);

  useEffect(() => {
    if (!db) { // ✅ Add db check
      console.error('Firestore not initialized');
      return;
    }

    const q = query(
      collection(db, 'books', slug, 'reviews'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, snap => {
      setReviews(
        snap.docs.map(d => ({ id: d.id, ...(d.data() as ReviewDoc) }))
      );
    });

    return unsubscribe; // ✅ Return cleanup function
  }, [slug]);

  const summary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const count = reviews.length;
    const avg =
      reviews.reduce((s, r) => s + (r.rating || 0), 0) / count;
    return { avg: Math.round(avg * 10) / 10, count };
  }, [reviews]);

  return (
    <section style={{ marginTop: '1rem' }}>
      <h3 className="h2">Community reviews</h3>
      <p className="muted">
        {summary.count
          ? `Average ${summary.avg}★ • ${summary.count} review${summary.count > 1 ? 's' : ''}`
          : 'No reviews yet'}
      </p>

      <div style={{ display: 'grid', gap: '.75rem', marginTop: '.5rem' }}>
        {reviews.map(r => (
          <article key={r.id} className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.userName}</strong>
              <span>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
            </div>
            {r.text && (
              <p style={{ marginTop: '.4rem', whiteSpace: 'pre-line' }}>
                {r.text}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}