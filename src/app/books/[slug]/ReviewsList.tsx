'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReviewDoc } from '@/types/firestore';

export default function ReviewsList({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // ✅ Fetch from API (uses dual-layer cache)
        const response = await fetch(`/api/books/${slug}/reviews`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        setReviews(data.reviews || []);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [slug]);

  const summary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const count = reviews.length;
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / count;
    return { avg: Math.round(avg * 10) / 10, count };
  }, [reviews]);

  if (loading) return <p className="muted">Loading reviews...</p>;

  return (
    <section style={{ marginTop: '1rem' }}>
      <h3 className="h2">Community reviews</h3>
      <p className="muted">
        {summary.count
          ? `Average ${summary.avg}★ • ${summary.count} review${summary.count > 1 ? 's' : ''}`
          : 'No reviews yet'}
      </p>

      <div style={{ display: 'grid', gap: '.75rem', marginTop: '.5rem' }}>
        {reviews.map((r) => (
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