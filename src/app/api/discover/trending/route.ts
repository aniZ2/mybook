// src/app/api/discover/trending/route.ts
import { NextRequest } from 'next/server';
import algoliasearch from 'algoliasearch';
import { getAdminDb } from '@/lib/firebase-admin'; // ✅ runtime-safe import
import { slugify } from '@/lib/slug';
import { Timestamp } from 'firebase-admin/firestore'; // optional: for type support

export const dynamic = 'force-dynamic';

/* ─────────────────────────────
   Environment Variables
────────────────────────────── */
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'books';

/* ─────────────────────────────
   Initialize Algolia Client
────────────────────────────── */
let index: any = null;
try {
  if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    index = client.initIndex(ALGOLIA_INDEX_NAME);
    console.log('✅ Connected to Algolia index:', ALGOLIA_INDEX_NAME);
  } else {
    console.warn('⚠️ Missing Algolia credentials — using Firestore fallback');
  }
} catch (err) {
  console.error('❌ Algolia init failed:', err);
}

/* ─────────────────────────────
   GET /api/discover/trending
────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    console.log('🚀 /api/discover/trending called');

    // ─── 1️⃣ Try Algolia first ───────────────
    if (index) {
      try {
        console.log('🧠 Querying Algolia trending replica...');
        const trendingIndexName = `${ALGOLIA_INDEX_NAME}_sort_search_score_desc`;
        let trendingIndex;

        try {
          trendingIndex = index.client.initIndex(trendingIndexName);
        } catch {
          trendingIndex = index;
          console.warn('⚠️ Trending replica not found, using main index instead');
        }

        const algoliaRes = await trendingIndex.search('', { hitsPerPage: 10 });

        const trendingBooks = (algoliaRes.hits || []).map((hit: any) => ({
          id: hit.objectID,
          slug:
            hit.slug ||
            slugify(
              hit.title,
              hit.authorName || hit.author || hit.authors?.[0] || hit.objectID
            ),
          title: hit.title,
          authorName: hit.authorName || hit.author || hit.authors?.[0] || 'Unknown',
          coverUrl: hit.coverUrl || hit.cover || null,
          description: hit.description || null,
          previewLink: hit.previewLink || null,
          buyLink: hit.buyLink || null,
          bnLink: hit.bnLink || null,
          googleLink: hit.googleLink || null,
          genres: hit.genres || [],
          publisher: hit.publisher || null,
          publishedDate: hit.publishedDate || null,
        }));

        console.log(`✅ Found ${trendingBooks.length} trending books`);
        return new Response(JSON.stringify({ books: trendingBooks }), {
          headers: { 'content-type': 'application/json' },
        });
      } catch (algoliaErr) {
        console.error('❌ Algolia trending query failed:', algoliaErr);
      }
    }

    // ─── 2️⃣ Fallback: Firestore (latest books) ───────────────
    console.warn('⚠️ Falling back to Firestore trending...');

    const dbAdmin = await getAdminDb(); // ✅ runtime-safe initialization
    const snap = await dbAdmin
      .collection('books')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const fallbackBooks = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        slug:
          data.slug ||
          slugify(data.title, data.authorName || data.authors?.[0] || d.id),
        title: data.title,
        authorName: data.authorName || data.authors?.[0] || 'Unknown',
        coverUrl: data.coverUrl || data.cover || null,
        description: data.description || null,
        buyLink: data.buyLink || null,
        bnLink: data.bnLink || null,
        googleLink: data.googleLink || null,
        genres: data.genres || [],
        publisher: data.publisher || null,
        publishedDate: data.publishedDate || null,
      };
    });

    console.log(`✅ Firestore fallback returned ${fallbackBooks.length} books`);
    return new Response(JSON.stringify({ books: fallbackBooks }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    console.error('🔥 Trending API crashed:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'unknown error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
