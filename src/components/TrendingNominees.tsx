'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import styles from './TrendingNominees.module.css';

export default function TrendingNominees({ clubSlug }: { clubSlug: string }) {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, [clubSlug]);

  const fetchTrending = async () => {
    try {
      const res = await fetch(`/api/clubs/${clubSlug}/nominations`);
      const data = await res.json();
      setBooks(data.nominations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} /> Loading trending books...
      </div>
    );

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <TrendingUp size={18} /> Trending on Booklyverse
      </h3>
      <div className={styles.grid}>
        {books.map((b) => (
          <div key={b.slug} className={styles.card}>
            <img
              src={b.coverUrl || '/placeholder-book.png'}
              alt={b.title}
              className={styles.cover}
            />
            <div className={styles.info}>
              <h4>{b.title}</h4>
              <p>by {b.authorName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
