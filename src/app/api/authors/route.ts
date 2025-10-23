// app/api/authors/route.ts
import { NextResponse } from 'next/server';
import { getAuthors } from '@/lib/authorsCache';

export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    console.log('🔍 API /authors called');
    
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '9');

    const allAuthors = await getAuthors();
    const authors = allAuthors.slice(0, pageSize);

    const duration = Date.now() - startTime;
    console.log(`⏱️  API completed in ${duration}ms`);

    return NextResponse.json({
      authors,
      total: allAuthors.length,
      hasMore: allAuthors.length > pageSize,
      cached: true, // Add this flag
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authors', details: error.message },
      { status: 500 }
    );
  }
}