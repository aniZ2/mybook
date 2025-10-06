import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

type BookItem = {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  cover?: string;
  publisher?: string;
  publishedDate?: string;
  buyLink?: string;
  bnLink?: string;
  googleLink?: string;
  genres?: string[];
  source: 'google' | 'isbndb';
};

/* ─────────────────────────────
   Normalize Google Books
────────────────────────────── */
function normalizeGoogle(json: any): BookItem[] {
  const items = json?.items || [];
  return items.map((it: any) => {
    const vol = it.volumeInfo || {};
    const ids = vol.industryIdentifiers || [];
    const isbn10 = ids.find((x: any) => x.type === 'ISBN_10')?.identifier;
    const isbn13 = ids.find((x: any) => x.type === 'ISBN_13')?.identifier;
    const cover = vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail;
    const title = vol.title || 'Untitled';
    const author = vol.authors?.[0] || '';

    return {
      id: it.id,
      title,
      authors: vol.authors || [],
      isbn10,
      isbn13,
      cover,
      publisher: vol.publisher || null,
      publishedDate: vol.publishedDate || null,
      genres: vol.categories || [],
      buyLink: `https://www.amazon.com/s?k=${encodeURIComponent(
        isbn13 || title + ' ' + author
      )}`,
      bnLink: `https://www.barnesandnoble.com/s/${encodeURIComponent(
        isbn13 || title + ' ' + author
      )}`,
      googleLink: vol.infoLink || `https://books.google.com/books?id=${it.id}`,
      source: 'google',
    };
  });
}

/* ─────────────────────────────
   Normalize ISBNdb
────────────────────────────── */
function normalizeISBNdb(json: any): BookItem[] {
  const books = json?.books || [];
  return books.slice(0, 20).map((b: any) => {
    const title = b.title;
    const author = b.authors?.[0] || '';
    const genres =
      Array.isArray(b.subjects) && b.subjects.length > 0
        ? b.subjects
        : b.genre
        ? [b.genre]
        : [];

    return {
      id: b.isbn13 || b.isbn10 || b.title,
      title,
      authors: b.authors || [],
      isbn10: b.isbn10,
      isbn13: b.isbn13,
      cover: b.image,
      publisher: b.publisher || null,
      publishedDate: b.date_published || null,
      genres,
      buyLink: `https://www.amazon.com/s?k=${encodeURIComponent(
        b.isbn13 || title + ' ' + author
      )}`,
      bnLink: `https://www.barnesandnoble.com/s/${encodeURIComponent(
        b.isbn13 || title + ' ' + author
      )}`,
      googleLink: `https://books.google.com?q=${encodeURIComponent(
        title + ' ' + author
      )}`,
      source: 'isbndb',
    };
  });
}

/* ─────────────────────────────
   GET handler
────────────────────────────── */
export async function GET(req: NextRequest) {
  // ✅ Basic rate limiting
  const rl = await checkRateLimit(req as any, 'book_search', 60, 60);
  if (!rl.ok)
    return new Response(
      JSON.stringify({ error: 'rate_limited', resetAt: rl.resetAt }),
      { status: 429 }
    );

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q)
    return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });

  const googleKey = process.env.GOOGLE_BOOKS_KEY;
  const isbndbKey = process.env.ISBNDB_KEY;

  const googleUrl = googleKey
    ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        q
      )}&maxResults=10&key=${googleKey}`
    : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        q
      )}&maxResults=10`;

  const isbndbUrl = `https://api2.isbndb.com/books/${encodeURIComponent(
    q
  )}?pageSize=10`;

  const [gRes, iRes] = await Promise.all([
    fetch(googleUrl).catch(() => null),
    isbndbKey
      ? fetch(isbndbUrl, { headers: { Authorization: isbndbKey } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const gJson = gRes && gRes.ok ? await gRes.json() : null;
  const iJson = iRes && iRes.ok ? await iRes.json() : null;

  const googleItems = gJson ? normalizeGoogle(gJson) : [];
  const isbndbItems = iJson ? normalizeISBNdb(iJson) : [];

  // ✅ Merge & deduplicate
  const seen = new Set<string>();
  const merged: BookItem[] = [];

  const add = (b: BookItem) => {
    const key = (
      b.isbn13 ||
      b.isbn10 ||
      `${b.title}|${b.authors?.[0] || ''}`
    ).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(b);
    }
  };

  googleItems.forEach(add);
  isbndbItems.forEach(add);

  return new Response(JSON.stringify({ results: merged }), {
    headers: { 'content-type': 'application/json' },
  });
}
