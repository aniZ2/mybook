'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import { Loader2, BookOpen, Library, ArrowLeft, Check } from 'lucide-react';
import styles from '../authors.module.css';
import type { AuthorDoc, BookDoc } from '@/types/firestore';

export default function AuthorBooksPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [author, setAuthor] = useState<AuthorDoc | null>(null);
  const [books, setBooks] = useState<BookDoc[]>([]);
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getDbOrThrow();

        // Fetch author
        const authorRef = doc(db, 'authors', slug);
        const authorSnap = await getDoc(authorRef);
        if (!authorSnap.exists()) throw new Error('Author not found');
        setAuthor(authorSnap.data() as AuthorDoc);

        // Fetch books by author
        const booksRef = collection(db, 'books');
        const q = query(booksRef, where('authorId', '==', slug));
        const booksSnap = await getDocs(q);
        const bookData = booksSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as BookDoc),
        }));
        setBooks(bookData);

        // Fetch user’s saved library (if logged in)
        if (user) {
          const libSnap = await getDocs(
            collection(db, 'users', user.uid, 'library')
          );
          setLibraryIds(libSnap.docs.map((d) => d.id));
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug, user]);

  const handleAddToLibrary = async (book: BookDoc) => {
    if (!user) return alert('Please sign in to add books to your library.');
    try {
      setAddingId(book.id!);
      const db = getDbOrThrow();
      const ref = doc(db, 'users', user.uid, 'library', book.id!);
      await setDoc(ref, {
        ...book,
        addedAt: serverTimestamp(),
      });
      setLibraryIds((prev) => [...prev, book.id!]);
    } catch (err) {
      console.error('Failed to add to library:', err);
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading author books...</p>
      </main>
    );
  }

  if (error || !author) {
    return (
      <main className={styles.stateContainer}>
        <p>{error || 'Author not found.'}</p>
        <Link href="/authors" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Authors
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.authorProfile}>
          {author.photoUrl ? (
            <Image
              src={author.photoUrl}
              alt={author.name}
              width={80}
              height={80}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1>{author.name}</h1>
            {author.about && <p className={styles.about}>{author.about}</p>}
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════ BOOKS ═══════════════════════════ */}
      <section className={styles.booksSection}>
        <h2 className={styles.sectionTitle}>
          <BookOpen size={18} /> Books by {author.name}
        </h2>

        {books.length === 0 ? (
          <p className={styles.empty}>No books found for this author.</p>
        ) : (
          <div className={styles.grid}>
            {books.map((book) => {
              const inLibrary = libraryIds.includes(book.id!);
              return (
                <div key={book.id} className={styles.card}>
                  <Link href={`/books/${book.slug}`}>
                    <Image
                      src={book.coverUrl || '/placeholder.png'}
                      alt={book.title}
                      width={120}
                      height={180}
                      className={styles.cover}
                    />
                  </Link>
                  <div className={styles.info}>
                    <h3>{book.title}</h3>
                    {book.description && (
                      <p>{book.description.slice(0, 80)}...</p>
                    )}
                    <div className={styles.actions}>
                      <Link href={`/books/${book.slug}`} className={styles.readBtn}>
                        <BookOpen size={14} /> Read Now
                      </Link>
                      <button
                        className={`${styles.libraryBtn} ${
                          inLibrary ? styles.inLibrary : ''
                        }`}
                        onClick={() => handleAddToLibrary(book)}
                        disabled={inLibrary || addingId === book.id}
                      >
                        {addingId === book.id ? (
                          <Loader2 size={14} className={styles.spinner} />
                        ) : inLibrary ? (
                          <>
                            <Check size={14} /> Added
                          </>
                        ) : (
                          <>
                            <Library size={14} /> Add to Library
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
