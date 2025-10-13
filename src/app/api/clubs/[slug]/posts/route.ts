import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  console.log('🚀 Create post API called');
  console.log('📍 Club slug:', params.slug);

  try {
    const dbAdmin = getAdminDb();
    console.log('✅ Admin DB initialized');

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);

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

    const body = await req.json();
    console.log('📝 Request body:', body);

    const { content } = body;

    if (!content || !content.trim()) {
      console.log('❌ Empty content');
      return NextResponse.json(
        { error: 'Post content cannot be empty' },
        { status: 400 }
      );
    }

    const { slug: clubSlug } = params;

    // Verify club exists
    const clubRef = dbAdmin.collection('clubs').doc(clubSlug);
    const clubSnap = await clubRef.get();
    
    if (!clubSnap.exists) {
      console.log('❌ Club not found:', clubSlug);
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    console.log('✅ Club found');

    // Create post
    const postData = {
      userId,
      userName,
      userPhoto: userData?.photoURL || null,
      content: content.trim(),
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      upvotedBy: [],
      visibility: 'public',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    console.log('📝 Creating post with data:', postData);

    const postRef = await clubRef.collection('posts').add(postData);
    console.log('✅ Post created with ID:', postRef.id);

    return NextResponse.json({
      success: true,
      post: {
        id: postRef.id,
        slug: postRef.id,
        clubSlug,
        ...postData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 500 }
    );
  }
}