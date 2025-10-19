import { NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';

// Simple fuzzy match helper
function fuzzyMatch(str: string, q: string): boolean {
  if (!str) return false;
  const clean = str.toLowerCase();
  const term = q.toLowerCase();
  // loose matching e.g. "har pot" => "har.*pot"
  const pattern = term.split(/\s+/).join('.*');
  return new RegExp(pattern).test(clean);
}

export async function GET(req: Request, context: { params: { slug: string } }) {
  const { slug } = context.params;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim().toLowerCase() || '';
  const startAfterId = searchParams.get('after') || null; // optional pagination
  const pageSize = Number(searchParams.get('limit') || 15);

  if (!slug) {
    return NextResponse.json({ error: 'Missing club slug' }, { status: 400 });
  }

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = getDbOrThrow();
    const booksRef = collection(db, 'clubs', slug, 'books');

    // Pull all or limited batch (Firestore doesn't support full-text)
    const baseQuery = query(booksRef, orderBy('title', 'asc'), limit(pageSize));

    const snap = await getDocs(baseQuery);

    interface ClubBook {
  id: string;
  title?: string;
  authorName?: string;
  author?: string;
  coverUrl?: string;
  status?: string;
}

const results = snap.docs
  .map((d) => {
  const data = d.data() as Omit<ClubBook, 'id'>;
  return { ...data, id: d.id };
})
  .filter(
    (b) =>
      fuzzyMatch(b.title || b.id, q) ||
      fuzzyMatch(b.authorName || b.author || '', q)
  );


    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;

    return NextResponse.json({
      results,
      nextCursor, // client can pass ?after=nextCursor for pagination
    });
  } catch (err) {
    console.error('🔥 Error searching club books:', err);
    return NextResponse.json(
      { error: 'Failed to search library' },
      { status: 500 }
    );
  }
}
