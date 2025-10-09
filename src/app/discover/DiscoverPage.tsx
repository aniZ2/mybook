'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/slug';
import DiscoverSection from './DiscoverSection';
import BookCard from './BookCard';
import AuthorCard from './AuthorCard';
import styles from './DiscoverPage.module.css';
import { BookDoc, AuthorDoc, PostDoc } from '@/types/firestore';

interface DiscoverPageProps {
  user?: { uid: string };
}

interface BookItem {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  asin?: string;
  cover?: string;
  publisher?: string;
  publishedDate?: string;
  buyLink?: string;
  bnLink?: string;
  googleLink?: string;
  genres?: string[];
  source: 'google' | 'isbndb' | 'amazon';
}

export default function DiscoverPage({ user }: DiscoverPageProps) {
  const router = useRouter();
  const [featured, setFeatured] = useState<BookDoc[]>([]);
  const [trending, setTrending] = useState<BookDoc[]>([]);
  const [forYou, setForYou] = useState<BookDoc[]>([]);
  const [authors, setAuthors] = useState<AuthorDoc[]>([]);
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  /* ─────────────── Load Discovery Feeds ─────────────── */
  useEffect(() => {
    console.log('🔄 Starting data fetch...');
    (async () => {
      try {
        const trendingPromise = fetch('/api/discover/trending')
          .then(res => (res.ok ? res.json() : { books: [] }))
          .then(data => data.books || [])
          .catch(err => {
            console.error('Trending API fetch error:', err);
            return [];
          });

        const authorsPromise = getDocs(
          query(collection(db, 'authors'), orderBy('followersCount', 'desc'), limit(8))
        ).then(snap => snap.docs.map(d => d.data() as AuthorDoc));

        const postsPromise = getDocs(
          query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10))
        ).then(snap => snap.docs.map(d => d.data() as PostDoc));

        let forYouPromise: Promise<BookDoc[]> = Promise.resolve([]);
        if (user?.uid) {
          forYouPromise = getDoc(doc(db, 'users', user.uid, 'preferences', 'bookPrefs'))
            .then(prefSnap => {
              const prefs = prefSnap.data();
              if (prefs?.genres?.length) {
                const qy = query(
                  collection(db, 'books'),
                  where('genres', 'array-contains-any', prefs.genres),
                  limit(10)
                );
                return getDocs(qy).then(snap => snap.docs.map(d => d.data() as BookDoc));
              } else {
                const qyAll = query(collection(db, 'books'), orderBy('createdAt', 'desc'), limit(10));
                return getDocs(qyAll).then(snap => snap.docs.map(d => d.data() as BookDoc));
              }
            })
            .catch(err => {
              console.warn('For You fetch failed, returning empty.', err);
              return [];
            });
        }

        const featuredPromise = getDocs(
          query(
            collection(db, 'books'),
            where('featured', '==', true),
            orderBy('createdAt', 'desc'),
            limit(10)
          )
        ).then(snap => snap.docs.map(d => d.data() as BookDoc));

        const [trendingData, authorsData, postsData, forYouData, featuredData] = await Promise.all([
          trendingPromise,
          authorsPromise,
          postsPromise,
          forYouPromise,
          featuredPromise,
        ]);

        setTrending(trendingData);
        setAuthors(authorsData);
        setPosts(postsData);
        setForYou(forYouData);
        setFeatured(featuredData);
        console.log('✅ Data fetch complete');
      } catch (err) {
        console.error('❌ Error loading discovery feeds:', err);
      }
    })();
  }, [user?.uid]);

  /* ─────────────── Search ─────────────── */
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    setItems([]);

    try {
      const fsQuery = query(
        collection(db, 'books'),
        where('title', '>=', q),
        where('title', '<=', q + '\uf8ff'),
        limit(10)
      );
      const fsSnap = await getDocs(fsQuery);
      const fsResults = fsSnap.docs.map(d => d.data() as BookItem);

      if (fsResults.length > 0) {
        setItems(fsResults);
        setBusy(false);
        return;
      }

      const res = await fetch('/api/books/search?q=' + encodeURIComponent(q));
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setItems(data.results || []);
      if (!data.results?.length) setError('No books found.');
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /* ─────────────── Add Book If Missing ─────────────── */
  async function addBookIfMissing(b: BookItem): Promise<string> {
    const slug = slugify(b.title, b.authors?.[0] || b.asin || b.isbn13);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) return slug;

    await setDoc(ref, {
      slug,
      title: b.title,
      authorName: b.authors?.[0] || 'Unknown',
      authors: b.authors || [],
      coverUrl: b.cover || null,
      description: b.publisher || null,
      previewLink: b.googleLink || null,
      buyLink: b.buyLink || null,
      bnLink: b.bnLink || null,
      googleLink: b.googleLink || null,
      publisher: b.publisher || null,
      publishedDate: b.publishedDate || null,
      genres: b.genres || [],
      createdAt: serverTimestamp(),
      savedAt: serverTimestamp(),
    });

    return slug;
  }

  async function viewDetails(b: BookItem) {
    try {
      setSaving(b.id);
      const slug = await addBookIfMissing(b);
      router.push(`/books/${slug}`);
    } catch (err) {
      console.error('Error saving book:', err);
      alert('Failed to save book.');
    } finally {
      setSaving(null);
    }
  }

  /* ─────────────── Render ─────────────── */
  return (
    <div className={styles.container}>
      <motion.section
        className={styles.introPanel}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className={styles.pageTitle}>Find Books You'll Love</h1>
        <p className={styles.pageIntro}>
          Whether you're looking for your next page-turner or exploring new genres,
          Booklyverse helps you discover books that match your reading style.
          Browse trending titles, get personalized picks, and meet the authors behind the stories.
        </p>

        {/* Search bar */}
        <form onSubmit={runSearch} className={styles.searchBar}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by title, author, ISBN, or ASIN..."
            className={styles.searchInput}
          />

          <div className={styles.searchButtonsRow}>
            <button disabled={busy} className={styles.searchButton}>
              {busy ? 'Searching...' : 'Search'}
            </button>
            <a href="/scan" className={styles.scanLink} aria-disabled={busy ? 'true' : 'false'}>
              Scan ISBN
            </a>
          </div>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {/* Search Results */}
        <AnimatePresence>
          {!busy &&
            items.map((b, idx) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={styles.resultCard}
                onClick={() => viewDetails(b)}
              >
                {b.cover ? (
                  <Image
                    src={b.cover}
                    alt={b.title}
                    width={80}
                    height={110}
                    className={styles.resultCover}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.noCover}>No Cover</div>
                )}
                <div className={styles.resultInfo}>
                  <h3>{b.title}</h3>
                  <p>{b.authors.join(', ')}</p>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.section>

      {/* Book Sections */}
      <DiscoverSection title="Featured Books">
        {featured.map(b => (
          <BookCard key={b.slug || b.id} book={b} />
        ))}
      </DiscoverSection>

      <DiscoverSection title="Trending Books">
        {trending.map(b => (
          <BookCard key={b.slug || b.id} book={b} />
        ))}
      </DiscoverSection>

      {user && forYou.length > 0 && (
        <DiscoverSection title="Recommended For You">
          {forYou.map(b => (
            <BookCard key={b.slug || b.id} book={b} />
          ))}
        </DiscoverSection>
      )}

      <DiscoverSection title="Emerging Authors">
        {authors.map(a => (
          <AuthorCard key={a.slug} author={a} />
        ))}
      </DiscoverSection>

      {/* Author CTA */}
      <motion.div className={styles.authorCTA} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2>✍️ Are you an author?</h2>
        <p>Feature your book and reach thousands of readers.</p>
        <button
          onClick={() => {
            if (user?.uid) {
              router.push('/author/submit');
            } else {
              router.push('/login?redirect=/author/submit');
            }
          }}
          className={styles.ctaButton}
        >
          Submit Your Book
        </button>
      </motion.div>
    </div>
  );
}
