import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

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
      return NextResponse.json({ clubs: [] });
    }

    // Get all clubs reading this book
    const clubsSnapshot = await dbAdmin
      .collection('clubs')
      .where('__name__', 'in', clubSlugs)
      .get();

    const clubs = clubsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: doc.id,
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        membersCount: data.membersCount,
        isPrivate: data.isPrivate || false,
        isCurrentlyReading: data.currentBookId === slug, // Compare with book slug
      };
    });

    // Sort: currently reading first, then by member count
    clubs.sort((a, b) => {
      if (a.isCurrentlyReading && !b.isCurrentlyReading) return -1;
      if (!a.isCurrentlyReading && b.isCurrentlyReading) return 1;
      return b.membersCount - a.membersCount;
    });

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}