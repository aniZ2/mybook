import { NextRequest } from 'next/server';

import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(req as any, 'generic_get', 60, 60);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  const url = new URL(req.url);
  const isbn = url.searchParams.get('isbn');
  if (!isbn) return new Response(JSON.stringify({ error: 'Missing isbn' }), { status: 400 });

  const key = process.env.GOOGLE_BOOKS_KEY;
  const gUrl = key
    ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&key=${key}`
    : `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;

  const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;

  const [gRes, oRes] = await Promise.all([ fetch(gUrl).catch(()=>null), fetch(olUrl).catch(()=>null) ]);
  const gJson = gRes && gRes.ok ? await gRes.json() : null;
  const oJson = oRes && oRes.ok ? await oRes.json() : null;

  return new Response(JSON.stringify({ google: gJson, openlibrary: oJson }), { headers: { 'content-type': 'application/json' } });
}
