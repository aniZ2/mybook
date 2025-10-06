import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit'; 

// Import Admin SDK instance AND the 'admin' namespace (required for serverTimestamp)
import { adminDb, admin } from '@/lib/firebase-admin'; 

import algoliasearch from 'algoliasearch';

// --- Algolia Client Setup (Search-Only Key for client-side search) ---
const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);
const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || 'books');

// --- External API Keys ---
const googleKey = process.env.GOOGLE_BOOKS_KEY;
const isbndbKey = process.env.ISBNDB_KEY;

// --- TypeScript Definition for Search Results ---
type BookItem = {
  id: string; // Google Books ID, ISBN, or ASIN
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
/** Handles fetch, checks response.ok, and safely parses JSON, logging errors. */
async function robustFetch(url: string, name: string, options?: RequestInit): Promise<{ json: any } | null> {
    try {
        const res = await fetch(url, options);
        
        if (!res.ok) {
            // Log the external API error status (e.g., 403, 404, 500)
            const errorText = await res.text();
            console.error(`External API Error (${name}): Status ${res.status}. Response: ${errorText.slice(0, 100)}...`);
            return null; // Don't crash the main route
        }
        
        const json = await res.json();
        return { json };
    } catch (err) {
        // Log network or JSON parsing failure
        console.error(`External API Fetch Failed (${name}):`, err);
        return null;
    }
}

/* ─────────── Helper: Normalize Google Books API Response ─────────── */
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

/* ─────────── Helper: Normalize ISBNdb API Response ─────────── */
function normalizeISBNdb(json: any): BookItem[] {
  const books = json?.books || [];
  return books.slice(0, 10).map((b: any) => {
    const genres =
      Array.isArray(b.subjects) && b.subjects.length > 0
        ? b.subjects
        : b.genre
        ? [b.genre]
        : [];
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

/* ─────────── Main GET Handler ─────────── */
export async function GET(req: NextRequest) {
  // 1. Rate Limiting Check
  const rl = await checkRateLimit(req as any, 'book_search', 60, 60); 
  if (!rl.ok)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q)
    return NextResponse.json({ error: 'missing query' }, { status: 400 });

  try {
    // 2. Try Algolia (Local Cache) Search First
    const algoliaRes = await index.search<BookItem>(q, { hitsPerPage: 10 });
    const localResults = algoliaRes.hits.map((h) => ({
      ...h,
      id: h.objectID, // Use objectID as the unique identifier
      source: 'algolia' as const,
    }));

    // If we found enough local books (e.g., 5 or more), return those primarily
    if (localResults.length >= 5) {
      // 3. Log search event (using Admin SDK's .add() method)
      await adminDb.collection('search_events').add({ 
        query: q,
        timestamp: admin.firestore.FieldValue.serverTimestamp(), 
      });
      return NextResponse.json({ results: localResults });
    }

    // 4. Fallback to External APIs (Google + ISBNdb)
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

    // Extract JSON results safely
    const gJson = gRes?.json || null;
    const iJson = iRes?.json || null;

    const googleItems = gJson ? normalizeGoogle(gJson) : [];
    const isbndbItems = iJson ? normalizeISBNdb(iJson) : [];

    // 5. Merge and Deduplicate Results
    const allResults = [...localResults, ...googleItems, ...isbndbItems];

    const seen = new Set();
    const deduped = allResults.filter((b) => {
      // Use ISBN or Title/Author combo for robust deduplication
      const key = (b.isbn13 || b.isbn10 || b.title + (b.authors?.[0] || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 6. Log search event for trending calculation
    if (deduped.length > 0) {
      await adminDb.collection('search_events').add({ 
        query: q,
        timestamp: admin.firestore.FieldValue.serverTimestamp(), 
      });
    }

    return NextResponse.json({ results: deduped });
  } catch (err: any) {
    console.error('Search error (Fatal Crash):', err);
    // Return a generic 500 error to the client, but the detailed error is logged above
    return NextResponse.json({ error: 'search_failed_internal' }, { status: 500 });
  }
}
