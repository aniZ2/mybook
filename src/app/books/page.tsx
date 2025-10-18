'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { bookConverter, BookDoc } from '@/types/firestore';
import styles from './books.module.css';

export default function BooksPage() {
  const [books, setBooks] = useState<BookDoc[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className={styles.libraryWrapper}>
      <header className={styles.libraryHeader}>
        <h1 className={styles.libraryTitle}>📚 Booklyverse Library</h1>
        <p className={styles.librarySubtitle}>Discover what the community is reading</p>
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
            <Link
              key={book.slug}
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
          ))}
        </motion.div>
      )}
    </div>
  );
}