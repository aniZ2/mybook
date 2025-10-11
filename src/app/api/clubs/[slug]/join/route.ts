// app/api/clubs/[slug]/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const clubSlug = params.slug;
    
    // Find club by slug
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
    const clubRef = clubDoc.ref;
    const clubData = clubDoc.data();
    const memberIds = clubData?.memberIds || [];

    // Check if already a member
    if (memberIds.includes(userId)) {
      return NextResponse.json(
        { error: 'Already a member of this club' },
        { status: 400 }
      );
    }

    // Add user to club's memberIds array and increment membersCount
    await clubRef.update({
      memberIds: FieldValue.arrayUnion(userId),
      membersCount: FieldValue.increment(1)
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the club'
    });

  } catch (error) {
    console.error('Error joining club:', error);
    return NextResponse.json(
      { error: 'Failed to join club' },
      { status: 500 }
    );
  }
}

// Optional: Leave club endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const clubSlug = params.slug;
    
    // Find club by slug
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
    
    const clubRef = clubsSnapshot.docs[0].ref;

    // Remove user from club's memberIds array and decrement membersCount
    await clubRef.update({
      memberIds: FieldValue.arrayRemove(userId),
      membersCount: FieldValue.increment(-1)
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully left the club'
    });

  } catch (error) {
    console.error('Error leaving club:', error);
    return NextResponse.json(
      { error: 'Failed to leave club' },
      { status: 500 }
    );
  }
}