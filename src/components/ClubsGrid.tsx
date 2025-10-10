'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clubConverter, type ClubDoc } from '@/types/firestore';
import styles from './ClubsGrid.module.css';

const CATEGORY_LABELS: Record<ClubDoc['category'], string> = {
  'fiction': 'Fiction',
  'non-fiction': 'Non-Fiction',
  'mystery': 'Mystery',
  'romance': 'Romance',
  'sci-fi': 'Sci-Fi',
  'fantasy': 'Fantasy',
  'biography': 'Biography',
  'general': 'General',
};

export default function ClubsGrid() {
  const [clubs, setClubs] = useState<ClubDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClubDoc['category'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'members' | 'recent' | 'name'>('members');

  useEffect(() => {
    async function loadClubs() {
      try {
        const ref = collection(db, 'clubs').withConverter(clubConverter);
        const q = query(ref, orderBy('membersCount', 'desc'), limit(100));
        const snap = await getDocs(q);
        setClubs(snap.docs.map((d) => d.data()));
      } catch (err) {
        console.error('❌ Failed to fetch clubs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, []);

  const filteredAndSortedClubs = useMemo(() => {
    let filtered = clubs;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower) ||
          c.tags?.some((tag) => tag.toLowerCase().includes(lower))
      );
    }

    filtered = filtered.filter((c) => c.isPublic);

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'members') return b.membersCount - a.membersCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return sorted;
  }, [clubs, searchTerm, categoryFilter, sortBy]);

  if (loading) return <ClubsLoadingSkeleton />;

  return (
    <div>
      {/* Filters */}
      <div className={styles.filtersBar}>
        <input
          type="search"
          placeholder="Search clubs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className={styles.sortSelect}
        >
          <option value="members">Most Members</option>
          <option value="recent">Recently Active</option>
          <option value="name">Alphabetical</option>
        </select>
      </div>

      {/* Categories */}
      <div className={styles.categories}>
        <button
          onClick={() => setCategoryFilter('all')}
          className={categoryFilter === 'all' ? styles.categoryChipActive : styles.categoryChip}
        >
          All
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key as ClubDoc['category'])}
            className={categoryFilter === key ? styles.categoryChipActive : styles.categoryChip}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className={styles.resultsCount}>
        {filteredAndSortedClubs.length} {filteredAndSortedClubs.length === 1 ? 'club' : 'clubs'}
      </p>

      {/* Grid */}
      <div className={styles.clubsGrid}>
        {filteredAndSortedClubs.map((club) => (
          <Link key={club.slug} href={`/clubs/${club.slug}`} className={styles.clubCard}>
            {/* Club Icon */}
            <div className={styles.clubIconWrapper}>
              {club.iconUrl ? (
                <Image
                  src={club.iconUrl}
                  alt={club.name}
                  width={64}
                  height={64}
                  className={styles.clubIcon}
                />
              ) : (
                <div className={styles.clubIconFallback}>
                  {club.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Club Info */}
            <div className={styles.clubInfo}>
              <h3 className={styles.clubName}>{club.name}</h3>
              <p className={styles.clubCategory}>{CATEGORY_LABELS[club.category]}</p>
              <p className={styles.clubDesc}>{club.description}</p>

              <div className={styles.clubStats}>
                <span>👥 {club.membersCount.toLocaleString()}</span>
                <span>📚 {club.booksCount}</span>
              </div>

              {club.tags?.length ? (
                <div className={styles.clubTags}>
                  {club.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* === Skeleton Loader === */
function ClubsLoadingSkeleton() {
  return (
    <div className={styles.clubsGrid}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={styles.clubCard}>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonTextShort} />
        </div>
      ))}
    </div>
  );
}
