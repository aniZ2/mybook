// app/api/clubs/route.ts
import { NextResponse } from 'next/server';
import { getClubs } from '@/lib/clubsCache';

// Cache for 24 hours - safety net
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // ✅ Get from cache (1 read on cache hit)
    const allClubs = await getClubs();
    
    // Return requested number
    const clubs = allClubs.slice(0, limit).map(club => ({
      id: club.id,
      slug: club.slug || club.id,
      name: club.name,
      description: club.description || '',
      coverImage: club.coverImage || '',
      iconUrl: club.coverImage || '', // Keep iconUrl for backwards compatibility
      memberCount: club.memberCount || 0,
      membersCount: club.memberCount || 0, // Keep both for backwards compatibility
      booksCount: 0, // You can add this field to Club interface if needed
      category: 'general', // You can add this field to Club interface if needed
    }));

    console.log(`✅ Returned ${clubs.length} clubs`);

    return NextResponse.json({ 
      success: true, 
      clubs 
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Clubs API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}