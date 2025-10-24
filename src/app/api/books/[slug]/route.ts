// app/api/books/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const revalidate = 3600; // 1 hour cache

interface BookData {
  id: string;
  slug: string;
  title?: string;
  authorName?: string;
  authorId?: string;
  coverUrl?: string;
  description?: string;
  [key: string]: any;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ unwrap params since it's now a Promise
    const { slug } = await params;

    const db = getAdminDb();
    const bookDoc = await db.collection('books').doc(slug).get();

    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData: BookData = {
      id: bookDoc.id,
      slug,
      ...bookDoc.data(),
    };

    // ✅ Fetch related books if authorId exists
    let relatedBooks: BookData[] = [];

    if (bookData.authorId) {
      const relatedSnap = await db
        .collection('books')
        .where('authorId', '==', bookData.authorId)
        .limit(5)
        .get();

      relatedBooks = relatedSnap.docs
        .map(
          (d) =>
            ({
              id: d.id,
              slug: d.id,
              ...d.data(),
            } as BookData)
        )
        .filter((b) => b.slug !== slug)
        .slice(0, 4);
    }

    return NextResponse.json({
      book: bookData,
      relatedBooks,
      cached: true,
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book', details: error.message },
      { status: 500 }
    );
  }
}
