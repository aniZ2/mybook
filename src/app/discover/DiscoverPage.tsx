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
  Timestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/slug';
import DiscoverSection from './DiscoverSection';
import BookCard from './BookCard';
import AuthorCard from './AuthorCard';
import ReaderPostCard from './ReaderPostCard';
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
  source: 'google' | 'isbndb' | 'amazon';
  genres?: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export default function DiscoverPage({ user }: DiscoverPageProps) {
  const router = useRouter();
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
    (async () => {
      try {
        const trendingSnap = await getDocs(
          query(collection(db, 'books'), orderBy('likesCount', 'desc'), limit(10))
        );
        setTrending(trendingSnap.docs.map((d) => d.data() as BookDoc));

        if (user?.uid) {
          const prefRef = doc(db, 'users', user.uid, 'preferences', 'bookPrefs');
          const prefSnap = await getDoc(prefRef);
          const prefs = prefSnap.data();
          if (prefs?.moods?.length) {
            const qy = query(
              collection(db, 'books'),
              where('moods', 'array-contains-any', prefs.moods),
              limit(10)
            );
            const snap = await getDocs(qy);
            setForYou(snap.docs.map((d) => d.data() as BookDoc));
          }
        }

        const authorsSnap = await getDocs(
          query(collection(db, 'authors'), orderBy('followersCount', 'desc'), limit(8))
        );
        setAuthors(authorsSnap.docs.map((d) => d.data() as AuthorDoc));

        const postsSnap = await getDocs(
          query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10))
        );
        setPosts(postsSnap.docs.map((d) => d.data() as PostDoc));
      } catch (err) {
        console.error('Error loading discovery feeds:', err);
      }
    })();
  }, [user?.uid]);

  /* ─────────────── External Search ─────────────── */
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    setItems([]);
    try {
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

    let description: string | null = null;
    let previewLink: string | null = null;
    let buyLink: string | null = b.buyLink || null;
    let genres: string[] = [];

    try {
      if (b.source === 'google') {
        const g = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${b.id}`
        ).then((r) => r.json());
        const v = g.volumeInfo || {};
        description = v.description ? stripHtml(v.description) : null;
        previewLink = v.previewLink ?? b.googleLink ?? null;
        buyLink = b.buyLink || g.saleInfo?.buyLink || null;
        genres = v.categories || [];
      } else if (b.source === 'isbndb') {
        description = b.publisher || null;
        genres = (b as any).subjects || (b as any).genre ? [((b as any).subjects || (b as any).genre)] : [];
      } else if (b.source === 'amazon' && b.asin) {
        description = `Amazon listing for ASIN ${b.asin}`;
        previewLink = `https://www.amazon.com/dp/${b.asin}`;
        buyLink = previewLink;
      }
    } catch (err) {
      console.warn('Could not fetch full details', err);
    }

    await setDoc(ref, {
      slug,
      title: b.title,
      authorName: b.authors?.[0] || 'Unknown',
      authors: b.authors || [],
      coverUrl: b.cover || null,
      description,
      previewLink,
      buyLink,
      bnLink: b.bnLink || null,
      googleLink: b.googleLink || null,
      publisher: b.publisher || null,
      publishedDate: b.publishedDate || null,
      genres,
      moods: [],
      pacing: 'medium',
      meta: {
        isbn10: b.isbn10 || null,
        isbn13: b.isbn13 || null,
        asin: b.asin || null,
      },
      createdAt: serverTimestamp(),
      savedAt: serverTimestamp(),
    });

    return slug;
  }

  /* ─────────────── View Details ─────────────── */
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
        className="panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className={styles.pageTitle}>Discover Books</h1>

        <form onSubmit={runSearch} className={styles.searchBar}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, ISBN, or ASIN..."
          />
          <button disabled={busy}>
            {busy ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        <AnimatePresence>
          {!busy &&
            items.map((b, idx) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`${styles.resultCard} panel`}
                onClick={() => viewDetails(b)}
              >
                {b.cover && (
                  <img src={b.cover} alt={b.title} className={styles.resultCover} />
                )}
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.authors.join(', ')}</p>

                  {/* 💛 Gold Genre Tags */}
                  {b.genres && b.genres.length > 0 && (
                    <div className={styles.genreTags}>
                      {b.genres.slice(0, 3).map((g) => (
                        <span key={g} className={styles.genreTag}>
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.section>

      <DiscoverSection title="Trending Books">
        {trending.map((b) => (
          <BookCard key={b.slug || b.id} book={b} />
        ))}
      </DiscoverSection>

      {user && forYou.length > 0 && (
        <DiscoverSection title="Recommended For You">
          {forYou.map((b) => (
            <BookCard key={b.slug || b.id} book={b} />
          ))}
        </DiscoverSection>
      )}

      <DiscoverSection title="Emerging Authors">
        {authors.map((a) => (
          <AuthorCard key={a.slug} author={a} />
        ))}
      </DiscoverSection>

      <DiscoverSection title="Reader Posts">
        {posts.map((p) => (
          <ReaderPostCard key={p.id} post={p} />
        ))}
      </DiscoverSection>
    </div>
  );
}
