'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
import {
  Users,
  BookOpen,
  Calendar,
  Heart,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import styles from './authors.module.css';

/* ════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════ */
interface Author {
  slug: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  booksCount?: number;
  createdAt?: any;
  followerIds?: string[];
}

interface Book {
  docId: string;
  title: string;
  coverUrl?: string;
  description?: string;
  slug?: string;
}

interface Follower {
  docId: string;
  userName: string;
  userPhoto?: string | null;
}

/* ════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════ */
export default function AuthorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();

  const [author, setAuthor] = useState<Author | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ════════════════════════════════════════════════
     FETCH DATA
  ═════════════════════════════════════════════════ */
  const fetchAuthorData = useCallback(async () => {
    try {
      const db = getDbOrThrow();

      // Author doc
      const docRef = doc(db, 'authors', slug);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Author not found');
      const authorData = docSnap.data() as Author;

      // Books by author
      const booksRef = collection(db, 'books');
      const booksQuery = query(booksRef, where('authorSlug', '==', slug));
      const booksSnap = await getDocs(booksQuery);
      const bookData = booksSnap.docs.map((d) => ({
        ...(d.data() as Book),
        docId: d.id,
      }));

      // Followers
      const followersRef = collection(db, `authors/${slug}/followers`);
      const followersSnap = await getDocs(followersRef);
      const followerData = followersSnap.docs.map((d) => ({
        ...(d.data() as Follower),
        docId: d.id,
      }));

      setAuthor(authorData);
      setBooks(bookData);
      setFollowers(followerData);
      setIsFollowing(authorData.followerIds?.includes(user?.uid || '') ?? false);
    } catch (err) {
      console.error('Error loading author:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, user?.uid]);

  useEffect(() => {
    fetchAuthorData();
  }, [fetchAuthorData]);

  /* ════════════════════════════════════════════════
     FOLLOW / UNFOLLOW HANDLER
  ═════════════════════════════════════════════════ */
  const handleFollow = async () => {
    if (!user) return alert('Please sign in to follow this author.');
    if (!author) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/authors/${slug}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setAuthor({
          ...author,
          followersCount: (author.followersCount || 0) + (isFollowing ? -1 : 1),
        });
      } else alert(data.error || 'Failed to update follow status');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  /* ════════════════════════════════════════════════
     HELPERS
  ═════════════════════════════════════════════════ */
  const formatDate = (dateValue?: any) => {
    if (!dateValue) return 'Recently Joined';
    try {
      let jsDate: Date;
      if (typeof dateValue.toDate === 'function') jsDate = dateValue.toDate();
      else jsDate = new Date(dateValue);
      return jsDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Recently Joined';
    }
  };

  /* ════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════ */
  if (loading)
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading author...</p>
      </main>
    );

  if (!author)
    return (
      <main className={styles.stateContainer}>
        <h2>Author not found.</h2>
      </main>
    );

  return (
    <main className={styles.authorPage}>
      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <motion.div
        className={styles.frostedHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.ambientBackground}>
          <div className={`${styles.blurOrb} ${styles.orb1}`} />
          <div className={`${styles.blurOrb} ${styles.orb2}`} />
        </div>

        <div className={styles.headerContent}>
          <div className={styles.avatarWrapper}>
            {author.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{author.name.charAt(0)}</div>
            )}
          </div>

          <div className={styles.authorInfo}>
            <div className={styles.titleRow}>
              <h1 className={styles.authorName}>{author.name}</h1>

              <button
                className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
                onClick={handleFollow}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 size={16} className={styles.loadingIcon} />
                ) : isFollowing ? (
                  <>
                    <CheckCircle2 size={16} /> Following
                  </>
                ) : (
                  <>
                    <Heart size={16} /> Follow
                  </>
                )}
              </button>
            </div>

            {author.bio && <p className={styles.bio}>{author.bio}</p>}

            <div className={styles.statsRow}>
              <span>
                <Users size={14} /> {author.followersCount ?? 0} followers
              </span>
              <span>•</span>
              <span>
                <BookOpen size={14} /> {author.booksCount ?? books.length} books
              </span>
              <span>•</span>
              <span>
                <Calendar size={14} /> Joined {formatDate(author.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════ BOOKS ═══════════════════════════ */}
      <section className={styles.booksSection}>
        <h2 className={styles.sectionTitle}>Books by {author.name}</h2>
        {books.length === 0 ? (
          <p className={styles.emptyMessage}>No books yet.</p>
        ) : (
          <div className={styles.booksGrid}>
            {books.map((book) => (
              <Link key={book.docId} href={`/books/${book.slug || book.docId}`}>
                <div className={styles.bookCard}>
                  <Image
                    src={book.coverUrl || '/placeholder.png'}
                    alt={book.title}
                    width={120}
                    height={180}
                    className={styles.bookCover}
                  />
                  <div className={styles.bookInfo}>
                    <h3 className={styles.bookTitle}>{book.title}</h3>
                    {book.description && (
                      <p className={styles.bookDesc}>
                        {book.description.slice(0, 60)}...
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════ FOLLOWERS ═══════════════════════════ */}
      <section className={styles.followersSection}>
        <h2 className={styles.sectionTitle}>Followers</h2>
        {followers.length === 0 ? (
          <p className={styles.emptyMessage}>No followers yet.</p>
        ) : (
          <div className={styles.followersGrid}>
            {followers.map((f) => (
              <div key={f.docId} className={styles.followerCard}>
                {f.userPhoto ? (
                  <img src={f.userPhoto} alt={f.userName} className={styles.followerAvatar} />
                ) : (
                  <div className={styles.followerFallback}>
                    {f.userName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <p>{f.userName}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
