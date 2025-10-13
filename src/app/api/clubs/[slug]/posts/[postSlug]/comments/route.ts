import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; postSlug: string } }
) {
  console.log('🚀 Create comment API called');
  console.log('📍 Club slug:', params.slug);
  console.log('📍 Post slug:', params.postSlug);

  try {
    const dbAdmin = getAdminDb();

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No auth token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log('👤 User ID:', userId);

    // Get user info
    const userDoc = await dbAdmin.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userName = userData?.displayName || decodedToken.name || 'Anonymous';
    console.log('👤 User name:', userName);

    const { content } = await req.json();
    console.log('📝 Comment content:', content);

    if (!content || !content.trim()) {
      console.log('❌ Empty content');
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    const { slug: clubSlug, postSlug } = params;

    const postRef = dbAdmin.collection('clubs').doc(clubSlug).collection('posts').doc(postSlug);

    // Verify post exists
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      console.log('❌ Post not found');
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    console.log('✅ Post found');

    // Create comment
    const commentData = {
      userId,
      userName,
      userPhoto: userData?.photoURL || null,
      content: content.trim(),
      createdAt: FieldValue.serverTimestamp(),
    };

    console.log('📝 Creating comment with data:', commentData);

    const commentRef = await postRef.collection('comments').add(commentData);
    console.log('✅ Comment created with ID:', commentRef.id);

    // Increment comment count on post
    await postRef.update({
      commentsCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Comment count incremented');

    return NextResponse.json({
      success: true,
      comment: {
        id: commentRef.id,
        ...commentData,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error posting comment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post comment' },
      { status: 500 }
    );
  }
}