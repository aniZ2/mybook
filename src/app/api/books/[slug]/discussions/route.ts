import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

function serialize(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((v) => serialize(v));

  const out: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (val && typeof val === 'object') {
      if (typeof (val as any).toDate === 'function') {
        try {
          out[key] = (val as any).toDate().toISOString();
        } catch (err) {
          out[key] = null;
        }
      } else {
        out[key] = serialize(val);
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    // Get book by slug
    const bookRef = dbAdmin.collection('books').doc(slug);
    const bookSnap = await bookRef.get();

    if (!bookSnap.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookSnap.data();
    const clubSlugs = bookData?.clubsReading || [];

    if (clubSlugs.length === 0) {
      return NextResponse.json({ discussions: [] });
    }

    // Get all public clubs reading this book
    const clubsSnapshot = await dbAdmin
      .collection('clubs')
      .where('__name__', 'in', clubSlugs)
      .where('isPrivate', '==', false)
      .get();

    const publicClubSlugs = clubsSnapshot.docs.map((doc) => doc.id);

    if (publicClubSlugs.length === 0) {
      return NextResponse.json({ discussions: [] });
    }

    // Get public posts about this book from public clubs
    const allDiscussions: any[] = [];

    for (const clubSlug of publicClubSlugs) {
      const postsSnapshot = await dbAdmin
        .collection('clubs')
        .doc(clubSlug)
        .collection('posts')
        .where('bookId', '==', slug) // Use book slug
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      postsSnapshot.docs.forEach((doc) => {
        allDiscussions.push({
          id: doc.id,
          clubSlug,
          ...serialize(doc.data()),
        });
      });
    }

    // Sort all discussions by date
    allDiscussions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ 
      discussions: allDiscussions.slice(0, 20)
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch discussions' },
      { status: 500 }
    );
  }
}