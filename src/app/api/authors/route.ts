// app/api/authors/route.ts
import { NextResponse } from 'next/server';
import { getAuthors } from '@/lib/authorsCache';

// Cache for 24 hours - safety net for edge cases
export const revalidate = 86400; // 24 hours = 86400 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '9');

    // Reads from Firestore cache (1 read on cache miss)
    const allAuthors = await getAuthors();
    
    const authors = allAuthors.slice(0, pageSize);

    return NextResponse.json({
      authors,
      total: allAuthors.length,
      hasMore: allAuthors.length > pageSize,
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authors', details: error.message },
      { status: 500 }
    );
  }
}