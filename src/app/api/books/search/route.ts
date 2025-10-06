export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { adminDb, admin } from '@/lib/firebase-admin';
import algoliasearch from 'algoliasearch';

// --- Algolia Client Setup ---
const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);
const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'books');

// --- External API Keys ---
const googleKey = process.env.GOOGLE_BOOKS_KEY;
const isbndbKey = process.env.ISBNDB_KEY;

// --- Type ---
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
  buyLink?: string;
  bnLink?: string;
  googleLink?: string;
  genres?: string[];
  source: 'algolia' | 'google' | 'isbndb';
};

/* ─────────── Helper: Robust External API Fetch ─────────── */
async function robustFetch(url: string, name: string, options?: RequestInit): Promise<{ json: any } | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`External API Error (${name}): Status ${res.status}. Response: ${errorText.slice(0, 100)}...`);
      return null;
    }
    const json = await res.json();
    return { json };
  } catch (err) {
    console.error(`External API Fetch Failed (${name}):`, err);
    return null;
  }
}

/* ─────────── Normalizers ─────────── */
function normalizeGoogle(json: any): BookItem[] {
  const items = json?.items || [];
  return items.map((it: any) => {
    const v = it.volumeInfo || {};
    const ids = v.industryIdentifiers || [];
    const isbn10 = ids.find((x: any) => x.type === 'ISBN_10')?.identifier;
    const isbn13 = ids.find((x: any) => x.type === 'ISBN_13')?.identifier;
    return {
      id: it.id,
      title: v.title || 'Untitled',
      authors: v.authors || [],
      isbn10,
      isbn13,
      cover: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail,
      publisher: v.publisher || null,
      publishedDate: v.publishedDate || null,
      genres: v.categories || [],
      buyLink: v.infoLink || null,
      googleLink: `https://books.google.com/books?id=${it.id}`,
      source: 'google',
    };
  });
}

function normalizeISBNdb(json: any): BookItem[] {
  const books = json?.books || [];
  return books.slice(0, 10).map((b: any) => {
    const genres = Array.isArray(b.subjects) && b.subjects.length > 0
      ? b.subjects
      : b.genre ? [b.genre] : [];
    return {
      id: b.isbn13 || b.isbn10 || b.title,
      title: b.title,
      authors: b.authors || [],
      isbn10: b.isbn10,
      isbn13: b.isbn13,
      cover: b.image,
      publisher: b.publisher || null,
      publishedDate: b.date_published || null,
      genres,
      buyLink: `https://www.amazon.com/s?k=${encodeURIComponent(b.isbn13 || b.title)}`,
      bnLink: `https://www.barnesandnoble.com/s/${encodeURIComponent(b.isbn13 || b.title)}`,
      googleLink: `https://books.google.com?q=${encodeURIComponent(b.title)}`,
      source: 'isbndb',
    };
  });
}

/* ─────────── Helper: Safe Logging ─────────── */
async function safeAddSearchEvent(q: string) {
  try {
    if (!adminDb) return;
    await adminDb.collection('search_events').add({
      query: q,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to log search event:', e);
  }
}

/* ─────────── Main GET Handler ─────────── */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(req as any, 'book_search', 60, 60);
  if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q) return NextResponse.json({ error: 'missing query' }, { status: 400 });

  try {
    // 1. Try Algolia (Local Cache)
    const algoliaRes = await index.search<BookItem>(q, { hitsPerPage: 10 });
    const localResults = algoliaRes.hits.map((h) => ({
      ...h,
      id: h.objectID,
      source: 'algolia' as const,
    }));

    // 2. Return Algolia if enough results
    if (localResults.length >= 5) {
      await safeAddSearchEvent(q);
      return NextResponse.json({ results: localResults });
    }

    // 3. Fallback to External APIs
    const googleUrl = googleKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&key=${googleKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`;
    const isbndbUrl = `https://api2.isbndb.com/books/${encodeURIComponent(q)}?pageSize=10`;

    const [gRes, iRes] = await Promise.all([
      robustFetch(googleUrl, 'Google Books'),
      isbndbKey
        ? robustFetch(isbndbUrl, 'ISBNdb', { headers: { Authorization: isbndbKey } })
        : Promise.resolve(null),
    ]);

    const googleItems = gRes?.json ? normalizeGoogle(gRes.json) : [];
    const isbndbItems = iRes?.json ? normalizeISBNdb(iRes.json) : [];

    const allResults = [...localResults, ...googleItems, ...isbndbItems];
    const seen = new Set();
    const deduped = allResults.filter((b) => {
      const key = (b.isbn13 || b.isbn10 || b.title + (b.authors?.[0] || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length > 0) await safeAddSearchEvent(q);

    return NextResponse.json({ results: deduped });
  } catch (err: any) {
    console.error('Search error (Fatal Crash):', err);
    return NextResponse.json({ error: 'search_failed_internal' }, { status: 500 });
  }
}
