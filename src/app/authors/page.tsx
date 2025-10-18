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
import { Users, BookOpen, Loader2 } from 'lucide-react';
import styles from './authorsList.module.css';

interface Author {
  slug: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  booksCount?: number;
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 9;

  const fetchAuthors = async (loadMore = false) => {
    try {
      const db = getDbOrThrow();
      let q;

      if (loadMore && lastDoc) {
        q = query(
          collection(db, 'authors'),
          orderBy('followersCount', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'authors'),
          orderBy('followersCount', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
        return;
      }

      const data: Author[] = snap.docs.map((d) => {
        const docData = d.data() as Partial<Author>;
        return {
          slug: d.id,
          name: docData.name || 'Unknown Author',
          bio: docData.bio || '',
          avatarUrl: docData.avatarUrl || '',
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
        <p>Once authors join, you’ll see them here!</p>
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
          <Link key={author.slug} href={`/authors/${author.slug}`}>
            <div className={styles.card}>
              <div className={styles.avatarWrapper}>
                {author.avatarUrl ? (
                  <img
                    src={author.avatarUrl}
                    alt={author.name}
                    className={styles.avatarImg}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className={styles.info}>
                <h2 className={styles.name}>{author.name}</h2>
                <p className={styles.bio}>
                  {author.bio ? author.bio.slice(0, 80) + '…' : 'No bio yet.'}
                </p>

                <div className={styles.stats}>
                  <span>
                    <Users size={14} /> {author.followersCount ?? 0} followers
                  </span>
                  <span>•</span>
                  <span>
                    <BookOpen size={14} /> {author.booksCount ?? 0} books
                  </span>
                </div>
              </div>
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
