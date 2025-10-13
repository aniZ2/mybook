import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow, getAuthOrThrow } from '@/lib/firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { clubSlug: string; postSlug: string } }
) {
  try {
    const { upvoted } = await request.json();
    const db = getDbOrThrow();
    const auth = getAuthOrThrow();
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = currentUser.uid;
    const postRef = doc(db, 'clubs', params.clubSlug, 'posts', params.postSlug);
    
    // Verify post exists
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Update upvote
    await updateDoc(postRef, {
      likesCount: increment(upvoted ? 1 : -1),
      upvotedBy: upvoted 
        ? arrayUnion(userId) 
        : arrayRemove(userId),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true, upvoted });
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json(
      { error: 'Failed to upvote post' },
      { status: 500 }
    );
  }
}