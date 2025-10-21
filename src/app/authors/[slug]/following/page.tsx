import { NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// Helper to resolve either slug or UID
async function resolveAuthor(db: any, slugOrId: string) {
  const slugSnap = await getDocs(
    query(collection(db, 'authors'), where('slug', '==', slugOrId), limit(1))
  );
  if (!slugSnap.empty) {
    const docRef = slugSnap.docs[0];
    return { id: docRef.id, data: docRef.data() };
  }

  const directSnap = await getDoc(doc(db, 'authors', slugOrId));
  if (directSnap.exists()) {
    return { id: directSnap.id, data: directSnap.data() };
  }

  return null;
}

/* ════════════════════════════════════════════════
   FOLLOW AUTHOR (POST)
════════════════════════════════════════════════ */
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const db = getDbOrThrow();
    const { userId } = await req.json();
    const slug = params.slug;

    console.log('➡️ FOLLOW REQUEST', { slug, userId });

    const author = await resolveAuthor(db, slug);
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const authorId = author.id;
    if (userId === authorId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const followerRef = doc(db, `authors/${authorId}/followers/${userId}`);
    const followingRef = doc(db, `authors/${userId}/following/${authorId}`);

    const userSnap = await getDoc(doc(db, 'authors', userId));
    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const authorData = author.data;

    const followerData = {
      userName: userData?.name || 'Unknown',
      userPhoto: userData?.photoUrl || null,
      followedAt: new Date(),
    };

    const followingData = {
      userName: authorData?.name || 'Unknown',
      userPhoto: authorData?.photoUrl || null,
      followedAt: new Date(),
    };

    // Writes trigger Cloud Function counters automatically
    await Promise.all([
      setDoc(followerRef, followerData),
      setDoc(followingRef, followingData),
    ]);

    console.log(`✅ ${userId} followed ${authorId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('🔥 Follow error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

/* ════════════════════════════════════════════════
   UNFOLLOW AUTHOR (DELETE)
════════════════════════════════════════════════ */
export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const db = getDbOrThrow();
    const { userId } = await req.json();
    const slug = params.slug;

    console.log('➡️ UNFOLLOW REQUEST', { slug, userId });

    const author = await resolveAuthor(db, slug);
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const authorId = author.id;
    if (userId === authorId) {
      return NextResponse.json(
        { error: 'Cannot unfollow yourself' },
        { status: 400 }
      );
    }

    const followerRef = doc(db, `authors/${authorId}/followers/${userId}`);
    const followingRef = doc(db, `authors/${userId}/following/${authorId}`);

    // These deletions trigger the decrement Cloud Function
    await Promise.all([deleteDoc(followerRef), deleteDoc(followingRef)]);

    console.log(`✅ ${userId} unfollowed ${authorId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('🔥 Unfollow error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
