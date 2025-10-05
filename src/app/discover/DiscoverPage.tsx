'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/slug';
import ScanISBN from '@/components/ScanISBN';
import DiscoverSection from './DiscoverSection';
import BookCard from './BookCard';
import AuthorCard from './AuthorCard';
import ReaderPostCard from './ReaderPostCard';
import styles from './DiscoverPage.module.css';
import { BookDoc, AuthorDoc, PostDoc } from '@/types/firestore';

interface DiscoverPageProps {
  user?: { uid: string };
}

interface DiscoverBook {
  id: string;
  title: string;
  authorName: string;
  description: string;
  coverUrl?: string;
  purchaseLink: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: string;
  genres?: string[];
}

interface BookItem {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  cover?: string;
  source: 'google' | 'openlibrary';
}

const genres = [
  'All Books',
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Fantasy',
  'Thriller',
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export default function DiscoverPage({ user }: DiscoverPageProps) {
  const router = useRouter();

  const [featured, setFeatured] = useState<DiscoverBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All Books');

  const [trending, setTrending] = useState<BookDoc[]>([]);
  const [forYou, setForYou] = useState<BookDoc[]>([]);
  const [authors, setAuthors] = useState<AuthorDoc[]>([]);
  const [posts, setPosts] = useState<PostDoc[]>([]);

  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  /* ─────────────── Load Featured Discover Books ─────────────── */
useEffect(() => {
  (async () => {
    try {
      const now = Timestamp.now();
      const qy = query(
        collection(db, 'discoverBooks'),
        where('status', '==', 'approved'),
        where('startDate', '<=', now),
        where('endDate', '>=', now)
      );
      const snap = await getDocs(qy);
      setFeatured(snap.docs.map((d) => ({ ...(d.data() as DiscoverBook), id: d.id })));
    } catch (err) {
      console.error('Error loading featured books:', err);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  /* ─────────────── Load Other Discovery Feeds ─────────────── */
  useEffect(() => {
    (async () => {
      try {
        // 🔥 Trending Books
        const trendingSnap = await getDocs(
          query(collection(db, 'books'), orderBy('likesCount', 'desc'), limit(10))
        );
        setTrending(trendingSnap.docs.map((d) => d.data() as BookDoc));

        // 🎯 Personalized “For You” Feed
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

        // 🌱 Emerging Authors
        const authorsSnap = await getDocs(
          query(collection(db, 'authors'), orderBy('followersCount', 'desc'), limit(8))
        );
        setAuthors(authorsSnap.docs.map((d) => d.data() as AuthorDoc));

        // 💬 Reader Posts
        const postsSnap = await getDocs(
          query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10))
        );
        setPosts(postsSnap.docs.map((d) => d.data() as PostDoc));
      } catch (err) {
        console.error('Error loading discovery feeds:', err);
      }
    })();
  }, [user?.uid]);

  /* ─────────────── Filter Featured Books ─────────────── */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return featured.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(s) || b.authorName.toLowerCase().includes(s);
      const matchesGenre =
        activeGenre === 'All Books' ||
        b.genres?.some((g) => g.toLowerCase() === activeGenre.toLowerCase());
      return matchesSearch && matchesGenre;
    });
  }, [featured, search, activeGenre]);

  /* ─────────────── External Book Search (Google/OpenLibrary) ─────────────── */
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
    const slug = slugify(b.title, b.authors?.[0]);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) return slug;

    let description: string | null = null;
    let previewLink: string | null = null;
    let buyLink: string | null = null;

    try {
      if (b.source === 'google') {
        const g = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${b.id}`
        ).then((r) => r.json());
        const v = g.volumeInfo || {};
        description = v.description ? stripHtml(v.description) : null;
        previewLink = v.previewLink ?? null;
        buyLink = g.saleInfo?.buyLink ?? null;
      } else {
        const key = b.id.replace('/works/', '');
        const o = await fetch(`https://openlibrary.org/works/${key}.json`).then((r) =>
          r.json()
        );
        description = o.description
          ? stripHtml(typeof o.description === 'string' ? o.description : o.description.value)
          : null;
      }
    } catch (err) {
      console.warn('Could not fetch full details', err);
    }

    await setDoc(
      ref,
      {
        slug,
        title: b.title,
        authorName: b.authors?.[0] || 'Unknown',
        authors: b.authors || [],
        coverUrl: b.cover || null,
        description,
        previewLink,
        buyLink,
        genres: [],
        moods: [],
        pacing: 'medium',
        meta: {
          source: b.source,
          isbn10: b.isbn10 || null,
          isbn13: b.isbn13 || null,
          sourceId: b.id || null,
        },
        savedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

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
      {/* 🔍 Global Book Search */}
      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Search Books</h1>
        <form onSubmit={runSearch} className={styles.searchBar}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
          />
          <button disabled={busy}>{busy ? 'Searching...' : 'Search'}</button>
        </form>

        <AnimatePresence>
          {!busy &&
            items.map((b, idx) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="panel"
                onClick={() => viewDetails(b)}
              >
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {b.cover && (
                    <img
                      src={b.cover}
                      alt={b.title}
                      style={{ width: 80, height: 120, objectFit: 'cover' }}
                    />
                  )}
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.authors.join(', ')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.section>

      <ScanISBN />

      {/* ⭐ Featured Books */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2>⭐ Featured Books</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title or author..."
        />
        <div className={styles.genreBar}>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={activeGenre === g ? styles.activeGenre : ''}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Loading featured books...</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((book) => (
              <a
                key={book.id}
                href={book.purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.card}
              >
                {book.coverUrl && <img src={book.coverUrl} alt={book.title} />}
                <h3>{book.title}</h3>
                <p>by {book.authorName}</p>
              </a>
            ))}
          </div>
        )}
      </motion.section>

      {/* 🔥 Trending, 🎯 For You, 🌱 Authors, 💬 Posts */}
      <DiscoverSection title="🔥 Trending Books">
        {trending.map((b) => (
          <BookCard key={b.slug || b.id} book={b} user={user} />
        ))}
      </DiscoverSection>

      {user && forYou.length > 0 && (
        <DiscoverSection title="🎯 For You">
          {forYou.map((b) => (
            <BookCard key={b.slug || b.id} book={b} user={user} />
          ))}
        </DiscoverSection>
      )}

      <DiscoverSection title="🌱 Emerging Authors">
        {authors.map((a) => (
          <AuthorCard key={a.slug} author={a} />
        ))}
      </DiscoverSection>

      <DiscoverSection title="💬 Reader Posts">
        {posts.map((p) => (
          <ReaderPostCard key={p.id} post={p} />
        ))}
      </DiscoverSection>

      {/* ✍️ Author CTA */}
      <motion.div
        className="panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: 'center', marginTop: '3rem' }}
      >
        <h2>✍️ Are you an author?</h2>
        <p>Feature your book and reach thousands of readers.</p>
        <a href="/author/submit" className="btn btn-primary">
          Submit Your Book
        </a>
      </motion.div>
    </div>
  );
}
