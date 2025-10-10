'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './ClubsPage.module.css';
import { Users, BookOpen, Sparkles } from 'lucide-react';

type Club = {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
};

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/clubs');
        const data = await res.json();
        setClubs(data.clubs || []);
      } catch (err) {
        console.error('Error loading clubs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className={styles.page}>
        <h2 style={{ textAlign: 'center', color: '#9ca3af' }}>Loading clubs...</h2>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* ─── Hero Header ─── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Join A Book Club <Sparkles className={styles.sparkleIcon} />
          </h1>
          <p className={styles.subtitle}>
            Discover passionate communities reading the same books, debating tropes, and celebrating stories together.
          </p>
          <Link href="/clubs/create" className={styles.createBtn}>
            + Create a Club
          </Link>
        </div>
      </section>

      {/* ─── Clubs Grid ─── */}
      <section className={styles.gridSection}>
        {clubs.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>
            No clubs found. <Link href="/clubs/create">Start one today!</Link>
          </p>
        ) : (
          <div className={styles.grid}>
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.slug}`}
                className={styles.clubCard}
              >
                <div className={styles.cardHeader}>
                  <Image
                    src={club.iconUrl || '/placeholder.png'}
                    alt={club.name}
                    width={60}
                    height={60}
                    className={styles.clubIcon}
                  />
                  <div>
                    <h3 className={styles.clubName}>{club.name}</h3>
                    <p className={styles.clubDescription}>
                      {club.description?.slice(0, 90) || 'A community of readers and dreamers.'}
                    </p>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span><Users size={15} /> {club.membersCount ?? 0} members</span>
                  <span><BookOpen size={15} /> {club.booksCount ?? 0} books</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
