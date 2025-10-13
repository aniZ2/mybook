import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin'; // ✅ Use the safe getter
import { getAuth } from 'firebase-admin/auth';

function serialize(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((v) => serialize(v));

  const out: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (val && typeof val === 'object') {
      if (typeof (val as any).toDate === 'function') {
        try {
          out[key] = (val as any).toDate().toISOString();
        } catch (err) {
          console.warn(`⚠️ Failed to serialize Timestamp for ${key}:`, err);
          out[key] = null;
        }
      } else {
        out[key] = serialize(val);
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; postSlug: string } }
) {
  try {
    const dbAdmin = getAdminDb(); // ✅ Use safe getter

    // Get current user
    let currentUserId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (err) {
        console.warn('⚠️ Invalid auth token:', err);
      }
    }

    const { slug: clubSlug, postSlug } = params;

    // Get post
    const postRef = dbAdmin.collection('clubs').doc(clubSlug).collection('posts').doc(postSlug);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postSnap.data()!;
    const upvotedBy = postData.upvotedBy || [];

    // Get comments
    const commentsSnap = await postRef
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();

    const comments = commentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...serialize(doc.data()),
    }));

    return NextResponse.json({
      post: {
        id: postSnap.id,
        slug: postSnap.id,
        clubSlug,
        ...serialize(postData),
        hasUpvoted: currentUserId ? upvotedBy.includes(currentUserId) : false,
      },
      comments,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}