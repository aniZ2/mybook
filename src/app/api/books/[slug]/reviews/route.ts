// app/api/books/[slug]/reviews/route.ts
import { NextResponse } from 'next/server';
import { getBookReviews } from '@/lib/reviewsCache';

export const revalidate = 3600; // 1 hour Next.js cache

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ Unwrap params before use (Next.js 14+)
    const { slug } = await params;

    const reviews = await getBookReviews(slug);

    return NextResponse.json({
      reviews,
      cached: true,
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
