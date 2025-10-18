'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  PlusCircle,
  Edit3,
  Trash2,
  Loader2,
} from 'lucide-react';
import styles from './dashboard.module.css';

/* ════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════ */
interface Author {
  slug: string;
  name: string;
  avatarUrl?: string;
  followersCount?: number;
  booksCount?: number;
}

interface Book {
  docId: string;
  title: string;
  slug: string;
  coverUrl?: string;
  createdAt?: any;
}

/* ════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════ */
export default function AuthorDashboardPage() {
  const { user } = useAuth();
  const [author, setAuthor] = useState<Author | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const db = getDbOrThrow();

      // Fetch author profile
      const authorQuery = query(
        collection(db, 'authors'),
        where('uid', '==', user.uid)
      );
      const authorSnap = await getDocs(authorQuery);
      if (!authorSnap.empty) {
        const doc = authorSnap.docs[0];
        setAuthor({ ...(doc.data() as Author), slug: doc.id });
      }

      // Fetch books by this author
      const booksRef = collection(db, 'books');
      const booksQuery = query(booksRef, where('authorUid', '==', user.uid));
      const booksSnap = await getDocs(booksQuery);
      const bookData = booksSnap.docs.map((d) => ({
        ...(d.data() as Book),
        docId: d.id,
      }));

      setBooks(bookData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <main className={styles.stateContainer}>
        <Loader2 size={28} className={styles.spinner} />
        <p>Loading your dashboard...</p>
      </main>
    );

  if (!user)
    return (
      <main className={styles.stateContainer}>
        <p>Please sign in to access your dashboard.</p>
      </main>
    );

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Author Dashboard</h1>
        {author && (
          <div className={styles.authorCard}>
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.name}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {author.name?.charAt(0)}
              </div>
            )}
            <div>
              <h2>{author.name}</h2>
              <p>
                <Users size={14} /> {author.followersCount ?? 0} followers •{' '}
                <BookOpen size={14} /> {author.booksCount ?? books.length} books
              </p>
            </div>
          </div>
        )}
      </header>

      <section className={styles.booksSection}>
        <div className={styles.sectionHeader}>
          <h2>Your Books</h2>
          <Link href="/authors/dashboard/books/submit" className={styles.addButton}>
            <PlusCircle size={16} /> New Book
          </Link>
        </div>

        {books.length === 0 ? (
          <p className={styles.emptyMessage}>You haven’t published any books yet.</p>
        ) : (
          <div className={styles.booksGrid}>
            {books.map((book) => (
              <motion.div
                key={book.docId}
                className={styles.bookCard}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Image
                  src={book.coverUrl || '/placeholder.png'}
                  alt={book.title}
                  width={120}
                  height={180}
                  className={styles.bookCover}
                />
                <div className={styles.bookInfo}>
                  <h3>{book.title}</h3>
                  <div className={styles.actions}>
                    <Link
                      href={`/authors/dashboard/books/edit/${book.docId}`}
                      className={styles.iconButton}
                    >
                      <Edit3 size={16} />
                    </Link>
                    <Link
                      href={`/authors/dashboard/books/delete/${book.docId}`}
                      className={styles.iconButton}
                    >
                      <Trash2 size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
