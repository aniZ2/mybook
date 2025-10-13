import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;
    
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { bookSlug, title, author, coverUrl, isbn, setAsCurrentlyReading } = await req.json();

    if (!bookSlug || !title || !author) {
      return NextResponse.json({ error: 'Book slug, title, and author required' }, { status: 400 });
    }

    // Get club and verify admin
    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubData = clubSnap.data();
    
    // Check if user is admin
    if (clubData?.ownerUid !== userId) {
      return NextResponse.json({ error: 'Only admins can add books' }, { status: 403 });
    }

    // Step 1: Ensure book exists in main books collection
    const bookRef = dbAdmin.collection('books').doc(bookSlug);
    const bookSnap = await bookRef.get();

    if (!bookSnap.exists) {
      // Create the book in main collection
      await bookRef.set({
        slug: bookSlug,
        title,
        authorName: author,
        coverUrl: coverUrl || null,
        meta: isbn ? { isbn13: isbn } : {},
        clubsReading: [slug],
        totalClubsCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Book exists, add this club to clubsReading
      await bookRef.update({
        clubsReading: FieldValue.arrayUnion(slug),
        totalClubsCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Step 2: Update club document
    if (setAsCurrentlyReading) {
      // Move old current book to past if exists
      const updates: any = { currentBookId: bookSlug };
      
      if (clubData.currentBookId && clubData.currentBookId !== bookSlug) {
        updates.pastBookIds = FieldValue.arrayUnion(clubData.currentBookId);
      }
      
      await clubRef.update(updates);
    } else {
      // Add to library (pastBookIds)
      await clubRef.update({
        pastBookIds: FieldValue.arrayUnion(bookSlug),
      });
    }

    // Step 3: Update booksCount
    await clubRef.update({
      booksCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      success: true,
      message: setAsCurrentlyReading ? 'Book set as currently reading' : 'Book added to library'
    });
  } catch (error) {
    console.error('Error adding book to club:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add book' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    // Get club
    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubData = clubSnap.data();
    const currentBookId = clubData?.currentBookId;
    const pastBookIds = clubData?.pastBookIds || [];

    const books = [];

    // Fetch current book
    if (currentBookId) {
      const bookSnap = await dbAdmin.collection('books').doc(currentBookId).get();
      if (bookSnap.exists) {
        books.push({
          id: bookSnap.id,
          slug: bookSnap.id,
          ...bookSnap.data(),
          isCurrentlyReading: true,
        });
      }
    }

    // Fetch past books
    if (pastBookIds.length > 0) {
      const pastBooksPromises = pastBookIds.map((bookId: string) =>
        dbAdmin.collection('books').doc(bookId).get()
      );
      const pastBooksSnaps = await Promise.all(pastBooksPromises);
      
      pastBooksSnaps.forEach((snap) => {
        if (snap.exists) {
          books.push({
            id: snap.id,
            slug: snap.id,
            ...snap.data(),
            isCurrentlyReading: false,
          });
        }
      });
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}