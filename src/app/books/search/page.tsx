'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { slugify } from '@/lib/slug';

/* ─────────────── Types ─────────────── */
type BookItem = {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  asin?: string;
  cover?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  buyLink?: string;
  bnLink?: string;
  googleLink?: string;
  source: 'google' | 'isbndb' | 'amazon';
};

/* ─────────────── Helpers ─────────────── */
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}
function isASIN(q: string) {
  return /^[A-Z0-9]{10}$/i.test(q.trim());
}

/* ─────────────── Component ─────────────── */
export default function BookSearch() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /* 🔍 Search Books / ASIN */
  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);

    try {
      // ✅ ASIN Shortcut
      if (isASIN(q)) {
        const asin = q.trim().toUpperCase();
        const item: BookItem = {
          id: asin,
          title: `Amazon Book (${asin})`,
          authors: [],
          asin,
          cover: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SX500_SY500_.jpg`,
          buyLink: `https://www.amazon.com/dp/${asin}`,
          source: 'amazon',
        };
        setItems([item]);
        setBusy(false);
        return;
      }

      // ✅ Search our unified API
      const res = await fetch('/api/books/search?q=' + encodeURIComponent(q));
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setItems(data.results || []);
    } catch (err) {
      console.error(err);
      setError('Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  /* ➕ Add to Firestore if missing */
  const addBookIfMissing = async (b: BookItem) => {
    const slug = slugify(b.title, b.authors?.[0] || b.asin || b.isbn13);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) return slug;

    let description: string | null =
      (b.description && b.description.trim()) || null;
    let previewLink: string | null = b.googleLink || null;
    let buyLink: string | null = b.buyLink || null;
    let averageRating: number | null = null;
    let ratingsCount: number | null = null;

    try {
      // Google fallback if description missing
      if (b.source === 'google' && !description) {
        const g = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${b.id}`
        ).then((r) => r.json());
        const v = g.volumeInfo || {};
        description = v.description
          ? stripHtml(v.description)
          : b.publisher || null;
        previewLink = previewLink ?? v.previewLink ?? null;
        buyLink =
          buyLink ??
          g.saleInfo?.buyLink ??
          `https://www.amazon.com/s?k=${encodeURIComponent(
            b.isbn13 || b.title
          )}`;
        averageRating = v.averageRating ?? null;
        ratingsCount = v.ratingsCount ?? null;
      }

      // ISBNdb fallback
      if (b.source === 'isbndb' && !description) {
        description = b.publisher || `Book entry for ${b.title}`;
      }

      // Amazon fallback
      if (b.source === 'amazon' && b.asin) {
        description = description || `Amazon listing for ASIN ${b.asin}`;
        buyLink = buyLink || `https://www.amazon.com/dp/${b.asin}`;
      }
    } catch (err) {
      console.warn('Could not fetch details:', err);
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
        publisher: b.publisher || null,
        publishedAt: b.publishedDate || null,
        genres: [],
        moods: [],
        pacing: 'medium',
        meta: {
          source: b.source,
          isbn10: b.isbn10 || null,
          isbn13: b.isbn13 || null,
          asin: b.asin || null,
          sourceId: b.id || null,
        },
        savedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return slug;
  };

  /* 🔗 View Details */
  const viewDetails = async (b: BookItem) => {
    try {
      const slug = await addBookIfMissing(b);
      router.push(`/books/${slug}`);
    } catch (err) {
      console.error('Error saving book:', err);
      alert('Failed to save book.');
    }
  };

  /* ─────────────── UI ─────────────── */
  return (
    <main
      style={{
        padding: '2rem',
        maxWidth: 800,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
        color: '#f5f5f5',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#d4af37',
          marginBottom: '1rem',
        }}
      >
        Search Books or ASINs
      </h1>

      <form
        onSubmit={search}
        style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem' }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter title, ISBN, or ASIN..."
          style={{
            flex: 1,
            padding: '.65rem .9rem',
            borderRadius: 6,
            border: '1px solid #555',
            background: '#111',
            color: '#eee',
          }}
        />
        <button
          disabled={busy}
          style={{
            background: '#d4af37',
            color: '#111',
            border: 'none',
            padding: '.65rem 1.2rem',
            borderRadius: 6,
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'tomato', marginBottom: '1rem' }}>{error}</p>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {items.map((b) => (
          <div
            key={b.id + (b.isbn13 || b.asin || '')}
            onClick={() => viewDetails(b)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = '#d4af37')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = '#333')
            }
          >
            {b.cover && (
              <img
                src={b.cover}
                alt={b.title}
                style={{
                  width: 70,
                  height: 100,
                  objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
            )}
            <div>
              <strong style={{ fontSize: '1rem', color: '#f5f5f5' }}>
                {b.title}
              </strong>
              <div style={{ color: '#9ca3af', fontSize: '.9rem' }}>
                {(b.authors || []).join(', ') || 'Unknown author'}
              </div>
              <div style={{ color: '#777', fontSize: '.8rem' }}>
                {b.asin
                  ? `ASIN: ${b.asin}`
                  : `ISBN: ${b.isbn13 || b.isbn10 || '—'}`}{' '}
                • {b.source.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
