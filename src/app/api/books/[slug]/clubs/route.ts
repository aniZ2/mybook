import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ unwrap the slug (Next.js 14+ params are Promises)
    const { slug } = await params;

    const dbAdmin = getAdminDb();

    // 🔍 Get book by slug
    const bookRef = dbAdmin.collection('books').doc(slug);
    const bookSnap = await bookRef.get();

    if (!bookSnap.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookSnap.data();
    const clubSlugs: string[] = bookData?.clubsReading || [];

    if (!Array.isArray(clubSlugs) || clubSlugs.length === 0) {
      return NextResponse.json({ clubs: [] });
    }

    // ⚠️ Firestore “in” query supports max 10 items per call
    const chunked = [];
    for (let i = 0; i < clubSlugs.length; i += 10) {
      chunked.push(clubSlugs.slice(i, i + 10));
    }

    const clubs: any[] = [];

    // 🔁 Fetch clubs in batches of ≤10
    for (const chunk of chunked) {
      const clubsSnapshot = await dbAdmin
        .collection('clubs')
        .where('__name__', 'in', chunk)
        .get();

      clubs.push(
        ...clubsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            slug: doc.id,
            name: data.name,
            description: data.description || '',
            iconUrl: data.iconUrl || '',
            membersCount: data.membersCount || 0,
            isPrivate: data.isPrivate || false,
            isCurrentlyReading: data.currentBookId === slug,
          };
        })
      );
    }

    // 🧩 Sort: current book first, then by member count
    clubs.sort((a, b) => {
      if (a.isCurrentlyReading && !b.isCurrentlyReading) return -1;
      if (!a.isCurrentlyReading && b.isCurrentlyReading) return 1;
      return b.membersCount - a.membersCount;
    });

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error('🔥 Error fetching clubs:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch clubs',
      },
      { status: 500 }
    );
  }
}
