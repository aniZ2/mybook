'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { slugify } from '@/lib/slug';

type BookItem = {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  cover?: string;
  source: 'google' | 'openlibrary';
};

export default function BookSearch() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
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
  }

  /** Save book to Firestore if it's not already there, return slug */
  async function addBookIfMissing(b: BookItem) {
    if (!db) { // ✅ Add db check
      throw new Error('Database not initialized');
    }

    const slug = slugify(b.title, b.authors?.[0]);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);

    let finalSlug = slug;
    if (snap.exists()) {
      const existing = snap.data() as any;
      const sameIsbn =
        existing?.meta?.isbn13 && b.isbn13
          ? existing.meta.isbn13 === b.isbn13
          : existing?.title === b.title &&
            existing?.authorName === (b.authors?.[0] || 'Unknown');

      if (!sameIsbn) {
        finalSlug = `${slug}-${(b.isbn13 || b.isbn10 || 'v2').toLowerCase()}`;
      } else {
        return finalSlug; // already saved & same book
      }
    }

    await setDoc(
      doc(db, 'books', finalSlug),
      {
        slug: finalSlug,
        title: b.title,
        authorName: b.authors?.[0] || 'Unknown',
        authors: b.authors || [],
        coverUrl: b.cover || null,
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

    return finalSlug;
  }

  async function viewDetails(b: BookItem) {
    try {
      const slug = await addBookIfMissing(b);
      router.push(`/books/${slug}`);
    } catch (err: any) {
      console.error('Error adding book:', err);
      alert(err.message || 'Failed to add book');
    }
  }

  return (
    <main className="grid" style={{ gap: '2rem' }}>
      <section className="panel col-12">
        <h1 className="h1">Search Books (Google + Open Library)</h1>

        <form onSubmit={search} className="search-bar">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try: The Name of the Wind"
          />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error && (
          <p className="muted" style={{ marginTop: '.5rem', color: 'tomato' }}>
            {error}
          </p>
        )}

        <div className="grid" style={{ marginTop: '1rem', gap: '1rem' }}>
          {items.length === 0 && !busy && !error ? (
            <p className="muted col-12">Search for books to get started!</p>
          ) : (
            items.map((b) => (
              <div key={b.id + (b.isbn13 || '')} className="panel col-6">
                <div style={{ display: 'flex', gap: '.8rem' }}>
                  {b.cover && (
                    <img
                      src={b.cover}
                      alt={b.title}
                      style={{
                        width: 64,
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 6,
                      }}
                    />
                  )}
                  <div>
                    <button
                      className="btn"
                      onClick={() => viewDetails(b)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Open details"
                    >
                      {b.title}
                    </button>
                    <div className="muted">{(b.authors || []).join(', ')}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      src: {b.source} • ISBN13: {b.isbn13 || '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}