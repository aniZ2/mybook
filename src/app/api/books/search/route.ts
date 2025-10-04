import { NextRequest } from 'next/server';

type BookItem = {
  id: string;
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  cover?: string;
  source: 'google' | 'openlibrary';
};

function normalizeGoogle(json:any): BookItem[] {
  const items = json?.items || [];
  return items.map((it:any) => {
    const vol = it.volumeInfo || {};
    const ids = vol.industryIdentifiers || [];
    const isbn10 = ids.find((x:any)=>x.type==='ISBN_10')?.identifier;
    const isbn13 = ids.find((x:any)=>x.type==='ISBN_13')?.identifier;
    const cover = vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail;
    return {
      id: it.id,
      title: vol.title || 'Untitled',
      authors: vol.authors || [],
      isbn10, isbn13,
      cover,
      source: 'google' as const,
    };
  });
}

function normalizeOpenLibrary(json:any): BookItem[] {
  const docs = json?.docs || [];
  return docs.slice(0, 20).map((d:any) => {
    const isbn10 = d.isbn?.find((x:string)=>x.length===10);
    const isbn13 = d.isbn?.find((x:string)=>x.length===13);
    const cover = d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined;
    return {
      id: d.key || d.cover_edition_key || (d.title + '-' + (d.author_name?.[0]||'')),
      title: d.title,
      authors: d.author_name || [],
      isbn10, isbn13,
      cover,
      source: 'openlibrary' as const,
    };
  });
}

import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(req as any, 'generic_get', 60, 60);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q) return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });

  // Google Books
  const key = process.env.GOOGLE_BOOKS_KEY;
  const googleUrl = key
    ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&key=${key}`
    : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20`;

  // Open Library
  const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20`;

  const [gRes, oRes] = await Promise.all([
    fetch(googleUrl).catch(()=>null),
    fetch(olUrl).catch(()=>null),
  ]);

  const gJson = gRes && gRes.ok ? await gRes.json() : null;
  const oJson = oRes && oRes.ok ? await oRes.json() : null;

  const googleItems = gJson ? normalizeGoogle(gJson) : [];
  const olItems = oJson ? normalizeOpenLibrary(oJson) : [];

  // naive merge: de-dup by isbn13 or title+author
  const seen = new Set<string>();
  const merged: BookItem[] = [];
  const add = (b:BookItem) => {
    const key = (b.isbn13 || b.isbn10 || `${b.title}|${(b.authors[0]||'')}`).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(b);
  };
  googleItems.forEach(add);
  olItems.forEach(add);

  return new Response(JSON.stringify({ results: merged }), { headers: { 'content-type': 'application/json' } });
}
