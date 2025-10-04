'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/slug';
import ScanISBN from '@/components/ScanISBN';

type DiscoverBook = {
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
};

type BookItem = {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  cover?: string;
  source: 'google' | 'openlibrary';
};

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

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}

export default function Discover() {
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All Books');

  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  
  const router = useRouter();

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
        const list: DiscoverBook[] = snap.docs.map(docu => ({
          id: docu.id,
          ...(docu.data() as Omit<DiscoverBook, 'id'>)
        }));
        setBooks(list);
      } catch (err) {
        console.error('Error loading Discover books:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return books.filter(b => {
      const matchesSearch =
        b.title.toLowerCase().includes(s) ||
        b.authorName.toLowerCase().includes(s);
      const matchesGenre =
        activeGenre === 'All Books' ||
        b.genres?.some(g => g.toLowerCase() === activeGenre.toLowerCase());
      return matchesSearch && matchesGenre;
    });
  }, [books, search, activeGenre]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!q.trim()) {
      return;
    }
    
    setBusy(true);
    setError(null);
    setItems([]);
    
    try {
      const res = await fetch('/api/books/search?q=' + encodeURIComponent(q));
      
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      
      const data = await res.json();
      
      setItems(data.results || []);
      
      if (!data.results || data.results.length === 0) {
        setError('No books found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addBookIfMissing(b: BookItem) {
    const slug = slugify(b.title, b.authors?.[0]);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) return slug;

    let description: string | null = null;
    let previewLink: string | null = null;
    let buyLink: string | null = null;
    let averageRating: number | null = null;
    let ratingsCount: number | null = null;

    try {
      if (b.source === 'google') {
        const g = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${b.id}`
        ).then(r => r.json());
        const v = g.volumeInfo || {};
        description = v.description ? stripHtml(v.description) : null;
        previewLink = v.previewLink ?? null;
        buyLink = g.saleInfo?.buyLink ?? null;
        averageRating = v.averageRating ?? null;
        ratingsCount = v.ratingsCount ?? null;
      } else {
        const key = b.id.replace('/works/', '');
        const o = await fetch(
          `https://openlibrary.org/works/${key}.json`
        ).then(r => r.json());
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
        averageRating,
        ratingsCount,
        genres: [],
        mood: [],
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
      alert('Failed to save book. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Global Book Search */}
      <motion.section
        className="panel col-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ 
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(168, 85, 247, 0.1))',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          position: 'absolute', 
          top: -100, 
          right: -100, 
          width: 300, 
          height: 300,
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15), transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '3rem',
              background: 'linear-gradient(135deg, var(--accent), var(--highlight))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1
            }}>
              🔍
            </div>
            <div>
              <h1 className="h1" style={{ marginBottom: '0.25rem' }}>Search Books</h1>
              <p className="muted" style={{ margin: 0 }}>
                Search millions of books from Google Books and Open Library
              </p>
            </div>
          </div>

          <form onSubmit={runSearch} className="search-bar">
  <input
    className="input"
    value={q}
    onChange={(e) => setQ(e.target.value)}
    placeholder="Search by title, author, or ISBN..."
  />
  <button 
    className="btn btn-primary" 
    disabled={busy} 
    type="submit"
  >
    {busy ? 'Searching...' : 'Search'}
  </button>
</form>

{error && (
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="muted"
    style={{ marginTop: '1rem', color: 'var(--highlight)', textAlign: 'center' }}
  >
    {error}
  </motion.p>
)}


          <AnimatePresence mode="wait">
            {busy && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '2rem' }}
              >
                <div style={{ 
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div className="muted">Searching books...</div>
                </div>
              </motion.div>
            )}

            {!busy && items.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid"
                style={{ marginTop: '1.5rem', gap: '1rem' }}
              >
                {items.map((b, idx) => (
                  <motion.div
                    key={b.id + (b.isbn13 || '')}
                    className="panel col-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      cursor: saving === b.id ? 'wait' : 'pointer',
                      opacity: saving === b.id ? 0.6 : 1,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => !saving && viewDetails(b)}
                    whileHover={{ 
                      scale: saving === b.id ? 1 : 1.02,
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(255,255,255,0.05))',
                      boxShadow: '0 12px 40px rgba(56, 189, 248, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {b.cover ? (
                        <img
                          src={b.cover}
                          alt={b.title}
                          style={{
                            width: 80,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 8,
                            flexShrink: 0,
                            border: '2px solid rgba(56, 189, 248, 0.2)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 80,
                            height: 120,
                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(168, 85, 247, 0.1))',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '2px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <span style={{ fontSize: '2.5rem' }}>📖</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="h2" style={{ fontSize: '1.1rem', margin: 0, marginBottom: '0.5rem' }}>
                          {b.title}
                        </h3>
                        <div className="muted" style={{ marginBottom: '0.75rem' }}>
                          {(b.authors || []).join(', ') || 'Unknown Author'}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            background: b.source === 'google' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                            color: b.source === 'google' ? 'var(--accent)' : 'var(--highlight)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {b.source === 'google' ? '📚 Google' : '📖 OpenLib'}
                          </span>
                          {b.isbn13 && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              fontSize: '0.75rem'
                            }}>
                              ISBN: {b.isbn13.slice(-4)}
                            </span>
                          )}
                        </div>
                        {saving === b.id && (
                          <div className="muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                            Saving book...
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ISBN Scanner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginTop: '2rem' }}
      >
        <ScanISBN />
      </motion.div>

      {/* Featured Books Section */}
      <motion.section
        className="panel col-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginTop: '3rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '3rem',
            background: 'linear-gradient(135deg, var(--highlight), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1
          }}>
            ⭐
          </div>
          <div>
            <h2 className="h1" style={{ margin: 0 }}>Featured Books</h2>
            <p className="muted" style={{ margin: 0 }}>
              Curated picks and author promotions
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Filter by title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ marginBottom: '1.5rem', maxWidth: 500 }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          {genres.map(g => (
            <button
              key={g}
              className={`btn ${activeGenre === g ? 'btn-primary' : ''}`}
              onClick={() => setActiveGenre(g)}
              style={{
                transition: 'all 0.3s ease'
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ 
              display: 'inline-block',
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <p className="muted" style={{ margin: 0 }}>Loading featured books...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ 
              display: 'inline-block',
              padding: '2rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <p className="muted" style={{ margin: 0 }}>No featured books match your filter.</p>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gap: '1.5rem' }}>
            {filtered.map((book, i) => (
              <motion.a
                key={book.id}
                href={book.purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="panel col-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: '0 12px 40px rgba(251, 191, 36, 0.2)'
                }}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ position: 'relative' }}>
                  {book.coverUrl && (
                    <>
                      <span style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        zIndex: 1,
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Featured
                      </span>
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        style={{
                          width: '100%',
                          height: 'auto',
                          aspectRatio: '2/3',
                          objectFit: 'cover',
                          marginBottom: '1rem',
                          borderRadius: '10px',
                          border: '2px solid rgba(251, 191, 36, 0.2)'
                        }}
                      />
                    </>
                  )}
                </div>
                <h3 className="h2" style={{ marginBottom: '0.5rem' }}>{book.title}</h3>
                <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  by {book.authorName}
                </p>
                <p style={{ margin: '0.75rem 0', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                  {book.description.length > 150
                    ? book.description.slice(0, 150) + '...'
                    : book.description}
                </p>
                <span className="btn btn-primary" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                  Learn More →
                </span>
              </motion.a>
            ))}
          </div>
        )}
      </motion.section>

      {/* Author CTA */}
      <motion.div
        className="panel col-12"
        style={{ 
          textAlign: 'center', 
          marginTop: '3rem', 
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1))',
          border: '1px solid rgba(251, 191, 36, 0.3)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div style={{ 
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          ✍️
        </div>
        <h2 className="h2">Are you an author?</h2>
        <p className="muted" style={{ marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Feature your book and reach thousands of engaged readers on Booklyverse
        </p>
        <a className="btn btn-primary" href="/author/submit" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
          Submit Your Book
        </a>
      </motion.div>
    </div>
  );
}