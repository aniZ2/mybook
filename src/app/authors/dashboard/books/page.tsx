'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { BookOpen, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import styles from '../dashboard.module.css';

interface Book {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  description?: string | null;
  createdAt?: any;
}

export default function AuthorBooksPage() {
  const { user, userDoc } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!userDoc?.slug) return;
    try {
      const db = getDbOrThrow();
      const q = query(collection(db, 'books'), where('authorSlug', '==', userDoc.slug));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Book[];
      setBooks(data);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }, [userDoc?.slug]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    setProcessingId(id);
    try {
      const db = getDbOrThrow();
      await deleteDoc(doc(db, 'books', id));
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Error deleting book:', err);
      alert('Failed to delete book. Try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spin} size={20} />
        <p>Loading your books...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardHome}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>My Books</h1>
        <Link href="/authors/submit" className={styles.primaryButton}>
          <Plus size={16} />
          Add New Book
        </Link>
      </div>

      {books.length === 0 ? (
        <p className={styles.emptyState}>
          You haven’t published any books yet.{' '}
          <Link href="/authors/submit" className={styles.linkAccent}>
            Publish your first one!
          </Link>
        </p>
      ) : (
        <div className={styles.booksGrid}>
          {books.map((book) => (
            <div key={book.id} className={styles.bookCard}>
              <div className={styles.bookCoverWrapper}>
                <Image
                  src={book.coverUrl || '/placeholder-book.png'}
                  alt={book.title}
                  width={140}
                  height={200}
                  className={styles.bookCover}
                />
              </div>
              <div className={styles.bookMeta}>
                <h3 className={styles.bookTitle}>{book.title}</h3>
                {book.description && (
                  <p className={styles.bookDesc}>
                    {book.description.slice(0, 80)}…
                  </p>
                )}
                <div className={styles.bookActions}>
                  <Link
                    href={`/books/${book.slug}`}
                    className={styles.iconButton}
                    title="View Book"
                  >
                    <BookOpen size={16} />
                  </Link>
                  <Link
                    href={`/authors/dashboard/books/edit/${book.id}`}
                    className={styles.iconButton}
                    title="Edit Book"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className={styles.iconButton}
                    disabled={processingId === book.id}
                    title="Delete Book"
                  >
                    {processingId === book.id ? (
                      <Loader2 className={styles.spin} size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
