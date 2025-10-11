import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { bookId, title, author, coverUrl, isbn, userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Book title and author are required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const clubSlug = params.slug;
    
    const clubsSnapshot = await db.collection('clubs')
      .where('slug', '==', clubSlug)
      .limit(1)
      .get();
    
    if (clubsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }
    
    const clubDoc = clubsSnapshot.docs[0];
    const clubData = clubDoc.data();
    
    if (clubData.ownerUid !== userId) {
      return NextResponse.json(
        { error: 'Only club admins can add books' },
        { status: 403 }
      );
    }

    const bookRef = db.collection('clubs').doc(clubDoc.id).collection('books').doc(bookId);
    await bookRef.set({
      bookId,
      title,
      author,
      coverUrl: coverUrl || null,
      isbn: isbn || null,
      addedBy: userId,
      addedAt: FieldValue.serverTimestamp(),
    });

    await clubDoc.ref.update({
      booksCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      message: 'Book added successfully',
    });

  } catch (error) {
    console.error('Error adding book:', error);
    return NextResponse.json(
      { error: 'Failed to add book' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const db = getAdminDb();
    const clubSlug = params.slug;
    
    const clubsSnapshot = await db.collection('clubs')
      .where('slug', '==', clubSlug)
      .limit(1)
      .get();
    
    if (clubsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }
    
    const clubDoc = clubsSnapshot.docs[0];
    
    const booksSnapshot = await db
      .collection('clubs')
      .doc(clubDoc.id)
      .collection('books')
      .orderBy('addedAt', 'desc')
      .get();
    
    const books = booksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ books });

  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}