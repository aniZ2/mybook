import { getAdminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST = Follow author
 * DELETE = Unfollow author
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const { slug } = params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const authorRef = db.collection('authors').doc(slug);
    const authorSnap = await authorRef.get();

    if (!authorSnap.exists) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const data = authorSnap.data() || {};
    const followerIds = new Set(data.followerIds || []);

    if (followerIds.has(userId)) {
      return NextResponse.json({ message: 'Already following' }, { status: 200 });
    }

    followerIds.add(userId);

    await authorRef.update({
      followerIds: Array.from(followerIds),
      followersCount: (data.followersCount || 0) + 1,
    });

    // Optional: Log follow event
    await db.collection('activityLogs').add({
      type: 'follow_author',
      userId,
      authorSlug: slug,
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Followed successfully' }, { status: 200 });
  } catch (err) {
    console.error('Follow error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const { slug } = params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const authorRef = db.collection('authors').doc(slug);
    const authorSnap = await authorRef.get();

    if (!authorSnap.exists) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const data = authorSnap.data() || {};
    const followerIds = new Set(data.followerIds || []);

    if (!followerIds.has(userId)) {
      return NextResponse.json({ message: 'Not following' }, { status: 200 });
    }

    followerIds.delete(userId);

    await authorRef.update({
      followerIds: Array.from(followerIds),
      followersCount: Math.max(0, (data.followersCount || 1) - 1),
    });

    // Optional: Log unfollow event
    await db.collection('activityLogs').add({
      type: 'unfollow_author',
      userId,
      authorSlug: slug,
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Unfollowed successfully' }, { status: 200 });
  } catch (err) {
    console.error('Unfollow error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
