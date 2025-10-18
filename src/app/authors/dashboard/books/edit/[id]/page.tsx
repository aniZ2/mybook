'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { slugify } from '@/lib/slug';
import { Loader2, CheckCircle2, UploadCloud, ExternalLink } from 'lucide-react';
import styles from './EditBook.module.css';

interface BookForm {
  id?: string;
  title: string;
  description: string;
  coverUrl?: string;
  tags?: string;
  genres?: string;
  slug?: string;
  publishedDate?: string | null;
}

export default function EditBookPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [book, setBook] = useState<BookForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBook = useCallback(async () => {
    try {
      const db = getDbOrThrow();
      const ref = doc(db, 'books', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Book not found');
      setBook({ id: snap.id, ...(snap.data() as BookForm) });
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const handleChange = (field: keyof BookForm, value: string) => {
    setBook((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!book) return;
    setIsSaving(true);
    try {
      const db = getDbOrThrow();
      const ref = doc(db, 'books', id);
      await updateDoc(ref, {
        ...book,
        updatedAt: serverTimestamp(),
      });
      setIsSaving(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!book?.title) return alert('Book must have a title before publishing.');
    setIsPublishing(true);
    try {
      const db = getDbOrThrow();
      const ref = doc(db, 'books', id);
      const newSlug = slugify(book.title);
      await updateDoc(ref, {
        slug: newSlug,
        publishedDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      setBook((prev) =>
        prev ? { ...prev, slug: newSlug, publishedDate: new Date().toISOString() } : prev
      );
      alert('✅ Book published successfully!');
      router.push(`/books/${newSlug}`);
    } catch (err) {
      console.error(err);
      setError('Failed to publish.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this book? It will no longer appear publicly.')) return;
    try {
      const db = getDbOrThrow();
      const ref = doc(db, 'books', id);
      await updateDoc(ref, {
        slug: null,
        publishedDate: null,
        updatedAt: serverTimestamp(),
      });
      setBook((prev) => (prev ? { ...prev, slug: undefined, publishedDate: null } : prev));
      alert('Book unpublished.');
    } catch (err) {
      console.error(err);
      setError('Failed to unpublish.');
    }
  };

  if (error) {
    return (
      <main className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
      </main>
    );
  }

  if (!book) {
    return (
      <main className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading book...</p>
      </main>
    );
  }

  return (
    <main className={styles.editPage}>
      <div className={styles.headerRow}>
        <h1>Edit Book</h1>
        <div className={styles.actions}>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className={styles.spinner} /> : <CheckCircle2 size={16} />}
            Save
          </button>

          {book.publishedDate ? (
            <>
              <button onClick={handleUnpublish}>Unpublish</button>
              {book.slug && (
                <a
                  href={`/books/${book.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.previewBtn}
                >
                  <ExternalLink size={14} />
                  Preview
                </a>
              )}
            </>
          ) : (
            <button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 size={16} className={styles.spinner} /> : <UploadCloud size={16} />}
              Publish
            </button>
          )}
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formSection}>
          <label>Title</label>
          <input
            type="text"
            value={book.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Book title"
          />

          <label>Description</label>
          <textarea
            value={book.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Brief summary or blurb"
            rows={6}
          />

          <label>Cover URL</label>
          <input
            type="url"
            value={book.coverUrl || ''}
            onChange={(e) => handleChange('coverUrl', e.target.value)}
            placeholder="https://example.com/cover.jpg"
          />
          {book.coverUrl && (
            <img src={book.coverUrl} alt="Cover Preview" className={styles.coverPreview} />
          )}

          <label>Genres (comma-separated)</label>
          <input
            type="text"
            value={book.genres || ''}
            onChange={(e) => handleChange('genres', e.target.value)}
            placeholder="fantasy, romance, thriller"
          />

          <label>Tags (comma-separated)</label>
          <input
            type="text"
            value={book.tags || ''}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="magic, love, betrayal"
          />
        </div>

        <div className={styles.metaSection}>
          <div className={styles.metaCard}>
            <p><strong>Slug:</strong> {book.slug || '— (unpublished)'}</p>
            <p><strong>Published:</strong> {book.publishedDate ? new Date(book.publishedDate).toLocaleDateString() : 'Draft'}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
