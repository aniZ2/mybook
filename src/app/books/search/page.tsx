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

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}

export default function BookSearch() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /** 🔍 Search Google + Open Library through our API route */
  const search = async (e?: React.FormEvent) => {
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
  };

  /** ➕ Save to Firestore (if missing) and return the slug, with description & links */
  const addBookIfMissing = async (b: BookItem) => {
    const slug = slugify(b.title, b.authors?.[0]);
    const ref  = doc(db, 'books', slug);
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
        description   = v.description ? stripHtml(v.description) : null;
        previewLink   = v.previewLink ?? null;
        buyLink       = g.saleInfo?.buyLink ?? null;
        averageRating = v.averageRating ?? null;
        ratingsCount  = v.ratingsCount ?? null;
      } else {
        const key = b.id.replace('/works/','');
        const o   = await fetch(
          `https://openlibrary.org/works/${key}.json`
        ).then(r => r.json());
        description = o.description
          ? stripHtml(typeof o.description === 'string' ? o.description : o.description.value)
          : null;
        // OpenLibrary does not give buy links or ratings
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
  };

  /** 👉 Click handler: ensure saved, then navigate to /books/[slug] */
  const viewDetails = async (b: BookItem) => {
    const slug = await addBookIfMissing(b);
    router.push(`/books/${slug}`);
  };

  return (
    <main className="grid" style={{ gap: '2rem' }}>
      <section className="panel col-12">
        <h1 className="h1">Search Books (Google + Open Library)</h1>

        <form onSubmit={search} style={{ display: 'flex', gap: '.6rem', marginTop: '1rem' }}>
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
          {items.map((b) => (
            <div
              key={b.id + (b.isbn13 || '')}
              className="panel col-6"
              style={{ cursor: 'pointer' }}
              onClick={() => viewDetails(b)}
            >
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
                  <strong>{b.title}</strong>
                  <div className="muted">{(b.authors || []).join(', ')}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    src: {b.source} • ISBN13: {b.isbn13 || '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
