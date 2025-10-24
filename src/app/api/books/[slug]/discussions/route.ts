import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ unwrap async params
    const { slug } = await params;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Firestore not initialized' }, { status: 500 });
    }

    // ✅ read book doc
    const bookDoc = await db.collection('books').doc(slug).get();

    if (!bookDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      );
    }

    // ✅ fetch discussions subcollection
    const discussionsSnap = await db
      .collection('books')
      .doc(slug)
      .collection('discussions')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const discussions = discussionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { success: true, discussions },
      { status: 200 }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('🔥 API /books/[slug]/discussions error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
