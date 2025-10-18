'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';
import styles from './DeleteBook.module.css';

interface BookDoc {
  id: string;
  title: string;
  slug?: string;
  publishedDate?: string | null;
  authorId?: string;
}

export default function DeleteBookPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [book, setBook] = useState<BookDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        const db = getDbOrThrow();
        const ref = doc(db, 'books', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Book not found');
        const data = snap.data() as Omit<BookDoc, 'id'>;
setBook({ ...data, id: snap.id });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [id]);

  const handleDelete = async () => {
    if (!book) return;
    if (!confirm(`Are you sure you want to delete "${book.title}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const db = getDbOrThrow();
      const ref = doc(db, 'books', id);
      await deleteDoc(ref);

      alert(`🗑️ "${book.title}" deleted successfully.`);
      router.push('/authors/dashboard/books');
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete book.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading book details...</p>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className={styles.stateContainer}>
        <p>{error || 'Book not found.'}</p>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={14} /> Go Back
        </button>
      </main>
    );
  }

  return (
    <main className={styles.deletePage}>
      <div className={styles.headerRow}>
        <h1>Delete Book</h1>
      </div>

      <div className={styles.bookCard}>
        <h2>{book.title}</h2>
        <p>
          {book.publishedDate
            ? '⚠️ This book is currently published.'
            : 'This book is still a draft.'}
        </p>
        <p>
          Deleting this book will permanently remove it from your dashboard
          and readers will no longer have access to it.
        </p>

        <div className={styles.actions}>
          <button onClick={() => router.back()} className={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 size={16} className={styles.spinner} /> : <Trash2 size={16} />}
            Delete Permanently
          </button>
        </div>
      </div>
    </main>
  );
}
