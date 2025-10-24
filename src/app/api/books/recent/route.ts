// app/api/books/recent/route.ts
import { NextResponse } from 'next/server';
import { getRecentBooks } from '@/lib/booksCache';

// Cache for 24 hours
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    // Get from cache
    const books = await getRecentBooks(limit);
    
    return NextResponse.json({ 
      books,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', details: error.message },
      { status: 500 }
    );
  }
}