'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider'; // ✅ Import useAuth
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
function getAnonId() {
  let id = localStorage.getItem('anon_uid');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('anon_uid', id);
  }
  return id;
}

/* ─────────────── Component ─────────────── */
export default function BookSearch() {
  const { user } = useAuth(); // ✅ Get user from context
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /* 🔍 Search Books / ASIN */
  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    
    if (!db) { // ✅ Add db check
      setError('Database not initialized');
      return;
    }

    const queryText = q.trim().toLowerCase();
    setBusy(true);
    setError(null);

    try {
      /* 🧭 Log search event only if not logged recently */
      const uid = user?.uid || getAnonId();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const searchQuery = query(
        collection(db, 'search_events'),
        where('uid', '==', uid),
        where('query', '==', queryText),
        where('timestamp', '>=', oneHourAgo),
        limit(1)
      );
      const existing = await getDocs(searchQuery);
      if (existing.empty) {
        await addDoc(collection(db, 'search_events'), {
          uid,
          query: queryText,
          timestamp: serverTimestamp(),
        });
      }

      /* 🧩 Handle ASIN lookup */
      if (isASIN(queryText)) {
        const asin = queryText.toUpperCase();
        setItems([
          {
            id: asin,
            title: `Amazon Book (${asin})`,
            authors: [],
            asin,
            cover: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SX500_SY500_.jpg`,
            buyLink: `https://www.amazon.com/dp/${asin}`,
            source: 'amazon',
          },
        ]);
        setBusy(false);
        return;
      }

      /* 🌐 Search your unified API */
      const res = await fetch('/api/books/search?q=' + encodeURIComponent(queryText));
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

  /* ➕ Add Book If Missing */
  const addBookIfMissing = async (b: BookItem) => {
    if (!db) { // ✅ Add db check
      throw new Error('Database not initialized');
    }

    const slug = slugify(b.title, b.authors?.[0] || b.asin || b.isbn13);
    const ref = doc(db, 'books', slug);
    const snap = await getDoc(ref);
    if (snap.exists()) return slug;

    let description: string | null = b.description || null;
    let previewLink: string | null = b.googleLink || null;
    let buyLink: string | null = b.buyLink || null;

    try {
      if (b.source === 'google' && !description) {
        const g = await fetch(`https://www.googleapis.com/books/v1/volumes/${b.id}`).then(r => r.json());
        const v = g.volumeInfo || {};
        description = v.description ? stripHtml(v.description) : b.publisher || null;
        previewLink = previewLink ?? v.previewLink ?? null;
        buyLink = buyLink ?? g.saleInfo?.buyLink ?? null;
      } else if (b.source === 'amazon' && b.asin) {
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
    } catch (err: any) {
      console.error('Error saving book:', err);
      alert(err.message || 'Failed to save book.');
    }
  };

  /* ─────────────── UI ─────────────── */
  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ color: '#d4af37', marginBottom: '1rem' }}>Search Books or ASINs</h1>

      <form onSubmit={search} style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter title, ISBN, or ASIN..."
          style={{ flex: 1, padding: '.65rem .9rem', borderRadius: 6 }}
        />
        <button disabled={busy} style={{ background: '#d4af37', color: '#111', borderRadius: 6, border: 'none', padding: '.65rem 1.2rem', cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'tomato' }}>{error}</p>}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {items.length === 0 && !busy && !error ? (
          <p style={{ color: '#999' }}>Search for books or enter an ASIN to get started!</p>
        ) : (
          items.map((b) => (
            <div 
              key={b.id} 
              onClick={() => viewDetails(b)} 
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                transition: 'all 0.2s'
              }}
            >
              {b.cover && <img src={b.cover} alt={b.title} width={70} height={100} style={{ borderRadius: 4 }} />}
              <div>
                <strong>{b.title}</strong>
                <p style={{ margin: '.25rem 0', color: '#999' }}>{b.authors.join(', ') || 'Unknown author'}</p>
                <small style={{ color: '#666' }}>{b.source.toUpperCase()}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}