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

    const { bookSlug } = await req.json(); // Changed from bookId to bookSlug

    if (!bookSlug) {
      return NextResponse.json({ error: 'Book slug required' }, { status: 400 });
    }

    // Get club and verify ownership
    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubData = clubSnap.data();
    if (clubData?.ownerUid !== userId) {
      return NextResponse.json({ error: 'Only club owner can set current book' }, { status: 403 });
    }

    // Get book and verify it exists
    const bookRef = dbAdmin.collection('books').doc(bookSlug);
    const bookSnap = await bookRef.get();

    if (!bookSnap.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Move current book to past books if it exists
    const updates: any = { currentBookId: bookSlug }; // Store slug
    
    if (clubData.currentBookId) {
      updates.pastBookIds = FieldValue.arrayUnion(clubData.currentBookId);
    }

    // Update club
    await clubRef.update(updates);

    // Add club to book's clubsReading array
    await bookRef.update({
      clubsReading: FieldValue.arrayUnion(slug),
      totalClubsCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      success: true,
      currentBookId: bookSlug 
    });
  } catch (error) {
    console.error('Error setting current book:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set current book' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get club and verify ownership
    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubData = clubSnap.data();
    if (clubData?.ownerUid !== userId) {
      return NextResponse.json({ error: 'Only club owner can remove current book' }, { status: 403 });
    }

    const currentBookSlug = clubData.currentBookId; // It's actually a slug

    if (!currentBookSlug) {
      return NextResponse.json({ error: 'No current book set' }, { status: 400 });
    }

    // Move to past books
    await clubRef.update({
      currentBookId: FieldValue.delete(),
      pastBookIds: FieldValue.arrayUnion(currentBookSlug),
    });

    // Remove club from book's clubsReading
    const bookRef = dbAdmin.collection('books').doc(currentBookSlug);
    await bookRef.update({
      clubsReading: FieldValue.arrayRemove(slug),
      totalClubsCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing current book:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove current book' },
      { status: 500 }
    );
  }
}