import { NextRequest } from 'next/server';
import algoliasearch from 'algoliasearch';
import { db } from '@/lib/firebase';
import { collection, orderBy, limit, getDocs, query } from 'firebase/firestore'; // ✅ added query

/* ─────────────────────────────
   Validate Environment Variables
────────────────────────────── */
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY; // Read-only search key
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'books';

if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
  console.warn('⚠️ Missing Algolia credentials — Trending API will use Firestore fallback.');
}

/* ─────────────────────────────
   Initialize Algolia Client
────────────────────────────── */
let index: any = null;
if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
  try {
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    index = client.initIndex(ALGOLIA_INDEX_NAME);
  } catch (err) {
    console.error('Algolia init failed:', err);
  }
}

/* ─────────────────────────────
   GET: /api/discover/trending
────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    // ─── 1️⃣ Try Algolia first ───────────────────────────────
    if (index) {
      const algoliaRes = await index.search('', {
        hitsPerPage: 10,
        sortFacetValuesBy: 'count',
        ranking: ['desc(search_score_24h)', 'typo'],
      });

      const trendingBooks = algoliaRes.hits.map((hit: any) => ({
        id: hit.objectID,
        title: hit.title,
        authorName: hit.authorName,
        coverUrl: hit.coverUrl,
        description: hit.description || null,
        previewLink: hit.previewLink || null,
        buyLink: hit.buyLink || null,
        genres: hit.genres || [],
        publisher: hit.publisher || null,
        publishedDate: hit.publishedDate || null,
      }));

      return new Response(JSON.stringify({ books: trendingBooks }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // ─── 2️⃣ Fallback: Firestore trending (latest 10) ───────────────
    const snap = await getDocs(
      query(collection(db, 'books'), orderBy('createdAt', 'desc'), limit(10))
    );
    const fallbackBooks = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return new Response(JSON.stringify({ books: fallbackBooks }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    console.error('🔥 Trending API error:', err);
    return new Response(
      JSON.stringify({ error: 'failed_to_fetch_trending' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
