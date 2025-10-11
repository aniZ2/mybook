// src/app/api/books/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/firebase'; // ✅ Changed import
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { slugify } from '@/lib/slug';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, authorName, authors, coverUrl, description, isbn13, isbn10 } = body;

    if (!title || !authorName) {
      return NextResponse.json(
        { error: 'Title and author name are required' }, 
        { status: 400 }
      );
    }

    // Get database instance - will throw if not initialized
    const db = getDbOrThrow(); // ✅ Added this line

    // Create slug from title and author
    const slug = slugify(title, authorName);
    const bookRef = doc(db, 'books', slug);

    // Check if book already exists
    const existing = await getDoc(bookRef);
    if (existing.exists()) {
      return NextResponse.json(
        { 
          error: 'Book already exists', 
          slug,
          existingBook: existing.data() 
        }, 
        { status: 409 }
      );
    }

    // Create book document
    const bookData = {
      slug,
      title,
      authorName,
      authors: authors || [authorName],
      coverUrl: coverUrl || null,
      description: description || null,
      genres: [],
      mood: [],
      pacing: 'medium',
      meta: {
        source: 'manual',
        isbn10: isbn10 || null,
        isbn13: isbn13 || null,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(bookRef, bookData);

    return NextResponse.json({ 
      success: true, 
      slug,
      book: bookData 
    });

  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' }, 
      { status: 500 }
    );
  }
}