'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { Users, BookOpen, Loader2, Crown } from 'lucide-react';
import styles from './authorsList.module.css';

interface Author {
  id: string; // Changed from slug to id (UID)
  slug?: string | null; // Optional slug for premium users
  name: string;
  bio?: string;
  photoUrl?: string;
  isPremium?: boolean;
  followersCount?: number;
  booksCount?: number;
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const PAGE_SIZE = 9;

  const genres = [
    'All',
    'Romance',
    'Fantasy',
    'Science Fiction',
    'Mystery',
    'Thriller',
    'Horror',
    'Historical Fiction',
    'Contemporary',
    'Young Adult',
    'Literary Fiction',
  ];

  const fetchAuthors = async (loadMore = false) => {
    try {
      const db = getDbOrThrow();
      let q;

      if (loadMore && lastDoc) {
        q = query(
          collection(db, 'authors'),
          orderBy('createdAt', 'desc'), // Changed to createdAt to show newest first
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'authors'),
          orderBy('createdAt', 'desc'), // Changed to createdAt to show newest first
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      
      console.log(`📚 Fetched ${snap.size} authors`);
      
      if (snap.empty) {
        setHasMore(false);
        return;
      }

      const data: Author[] = snap.docs.map((d) => {
        const docData = d.data() as Partial<Author>;
        console.log('Author doc:', d.id, docData.name);
        return {
          id: d.id, // This is the UID
          slug: docData.slug || null, // Premium users might have this
          name: docData.name || 'Unknown Author',
          bio: docData.bio || '',
          photoUrl: docData.photoUrl || '',
          isPremium: docData.isPremium || false,
          followersCount: docData.followersCount || 0,
          booksCount: docData.booksCount || 0,
        };
      });

      if (loadMore) {
        setAuthors((prev) => [...prev, ...data]);
      } else {
        setAuthors(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching authors:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAuthors(false);
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchAuthors(true);
  };

  // Helper to get the correct URL for an author
  const getAuthorUrl = (author: Author) => {
    // Premium users with custom slug use their slug, others use UID
    return `/authors/${author.isPremium && author.slug ? author.slug : author.id}`;
  };

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <h2>Loading authors...</h2>
      </main>
    );
  }

  if (authors.length === 0) {
    return (
      <main className={styles.stateContainer}>
        <h2>No authors yet</h2>
        <p>Once authors join, you'll see them here!</p>
      </main>
    );
  }

  return (
    <main className={styles.authorsPage}>
      <motion.div
        className={styles.headerContainer}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className={styles.title}>Our Authors</h1>
        <p className={styles.subtitle}>
          Discover talented authors sharing their stories and building literary worlds.
        </p>
      </motion.div>

      <div className={styles.grid}>
        {authors.map((author) => (
          <Link key={author.id} href={getAuthorUrl(author)}>
            <div className={styles.card}>
              <div className={styles.avatarWrapper}>
                {author.photoUrl ? (
                  <img
                    src={author.photoUrl}
                    alt={author.name}
                    className={styles.avatarImg}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {author.isPremium && (
                  <div className={styles.premiumBadge} title="Premium Author">
                    <Crown size={14} />
                  </div>
                )}
              </div>

              <h2 className={styles.name}>{author.name}</h2>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button
            onClick={handleLoadMore}
            className={styles.loadMoreButton}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className={styles.spin} size={18} /> : 'Load More'}
          </button>
        </div>
      )}
    </main>
  );
}