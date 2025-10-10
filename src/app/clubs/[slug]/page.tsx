'use client';

import { useEffect, useState } from 'react';
import ClubHeader from '@/components/ClubHeader'; // ✅ new header component
import styles from '../ClubsPage.module.css';

export default function ClubsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [clubData, setClubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ───────────────────────────────
  // 🔍 Fetch Club Data
  // ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}`);
        if (!res.ok) throw new Error('Club not found');
        const data = await res.json();
        setClubData(data);
      } catch (err) {
        console.error('Error fetching club data:', err);
        setClubData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // ───────────────────────────────
  // 🌀 Loading / Not Found States
  // ───────────────────────────────
  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <h2>Loading club details...</h2>
      </main>
    );
  }

  if (!clubData?.club) {
    return (
      <main className={styles.stateContainer}>
        <h1>Club Not Found</h1>
        <p className={styles.stateHint}>Try again later.</p>
      </main>
    );
  }

  // ───────────────────────────────
  // ✅ Club Page Render
  // ───────────────────────────────
  const { club } = clubData;

  return (
    <main className={styles.clubPage}>
      <ClubHeader club={club} />

      {/* Placeholder sections for now */}
      <section className={styles.section}>
        <h2>Recent Posts</h2>
        <p>Coming soon — discussions, polls, and more!</p>
      </section>

      <section className={styles.section}>
        <h2>About This Club</h2>
        <p>
          {club.description ||
            'This club doesn’t have a description yet. Stay tuned for updates!'}
        </p>
      </section>
    </main>
  );
}
