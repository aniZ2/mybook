'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { bookConverter, BookDoc } from '@/types/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import styles from './books.module.css';

export default function BooksPage() {
  const [books, setBooks] = useState<BookDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const selectForNomination = searchParams.get('selectForNomination');
  const isNominationMode = Boolean(selectForNomination);

  /* ─────────────── Fetch Books ─────────────── */
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const db = getDbOrThrow();
        const booksRef = collection(db, 'books').withConverter(bookConverter);
        const q = query(booksRef, orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBooks(docs);
      } catch (err) {
        console.error('Error fetching books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  /* ─────────────── Toast Helper ─────────────── */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  /* ─────────────── Handle Nomination ─────────────── */
  const handleNominate = async (book: BookDoc) => {
    if (!selectForNomination) return;
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return showToast('Please sign in as admin to nominate', 'error');
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${selectForNomination}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: book.title,
          author: book.authorName,
          coverUrl: book.coverUrl,
          nominateForNext: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nomination failed');

      showToast(`“${book.title}” nominated successfully!`);
      setTimeout(() => router.push(`/clubs/${selectForNomination}`), 1500);
    } catch (err) {
      console.error('❌ Nomination failed:', err);
      showToast('Failed to nominate book', 'error');
    }
  };

  /* ─────────────── Render ─────────────── */
  return (
    <div className={styles.libraryWrapper}>
      <header className={styles.libraryHeader}>
        <h1 className={styles.libraryTitle}>
          {isNominationMode ? '✨ Select a Book to Nominate' : '📚 Booklyverse Library'}
        </h1>
        <p className={styles.librarySubtitle}>
          {isNominationMode
            ? 'Choose a book from your library to nominate for your club'
            : 'Discover what the community is reading'}
        </p>
      </header>

      {loading ? (
        <p className={styles.loading}>Loading books...</p>
      ) : books.length === 0 ? (
        <p className={styles.empty}>No books found.</p>
      ) : (
        <motion.div
          className={styles.bookGrid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {books.map((book) => (
            <div key={book.slug} className={styles.bookCardWrapper}>
              <Link
                href={`/books/${book.slug}`}
                className={styles.bookCard}
                title={`${book.title} by ${book.authorName}`}
              >
                <img
                  src={book.coverUrl || '/placeholder-book.png'}
                  alt={book.title}
                  className={styles.bookCover}
                />
              </Link>

              {/* Nominate Button */}
              {isNominationMode && (
                <button
                  className={styles.nominateBtn}
                  onClick={() => handleNominate(book)}
                >
                  Nominate for Club
                </button>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${
              toast.type === 'error' ? styles.toastError : styles.toastSuccess
            }`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
