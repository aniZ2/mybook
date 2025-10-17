'use client';

import React, { useState } from 'react';
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
import { useAuth } from '@/context/AuthProvider';
import { slugify } from '@/lib/slug';

export type BookItem = {
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

interface Props {
  onSelect?: (b: BookItem) => void;
}

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

export default function BookSearchPanel({ onSelect }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<BookItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim() || !db) return;
    const queryText = q.trim().toLowerCase();
    setBusy(true);
    setError(null);
    setItems([]);

    try {
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

      const res = await fetch('/api/books/search?q=' + encodeURIComponent(queryText));
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setItems(data.results || []);
      if (!data.results?.length) setError('No books found.');
    } catch (err) {
      console.error(err);
      setError('Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 12 }}>
      <form onSubmit={search} style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter title, ISBN, or ASIN..."
          style={{
            flex: 1,
            padding: '.65rem .9rem',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
          }}
        />
        <button
          disabled={busy}
          style={{
            background: '#d4af37',
            color: '#111',
            borderRadius: 6,
            border: 'none',
            padding: '.65rem 1.2rem',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
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
              onClick={() => onSelect?.(b)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                transition: 'all 0.2s',
              }}
            >
              {b.cover && (
                <img
                  src={b.cover}
                  alt={b.title}
                  width={70}
                  height={100}
                  style={{ borderRadius: 4 }}
                />
              )}
              <div>
                <strong>{b.title}</strong>
                <p style={{ margin: '.25rem 0', color: '#999' }}>
                  {b.authors.join(', ') || 'Unknown author'}
                </p>
                <small style={{ color: '#666' }}>{b.source.toUpperCase()}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
