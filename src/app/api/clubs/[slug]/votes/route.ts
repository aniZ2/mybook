import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/clubs/[slug]/votes
 * Body: { bookSlug: string }
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    // Parse book
    const { bookSlug } = await req.json();
    if (!bookSlug)
      return NextResponse.json({ error: 'Missing bookSlug' }, { status: 400 });

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });

    const clubData = clubSnap.data();
    if (!clubData?.roundActive)
      return NextResponse.json({ error: 'Voting is not active' }, { status: 400 });

    // ────────────── Check if already voted
    const existingVoteSnap = await dbAdmin
      .collection(`clubs/${slug}/votes`)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingVoteSnap.empty) {
      return NextResponse.json({ error: 'You have already voted this round' }, { status: 400 });
    }

    // ────────────── Record vote
    const voteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(bookSlug);
    await dbAdmin.runTransaction(async (tx) => {
      const voteSnap = await tx.get(voteRef);
      if (voteSnap.exists) {
        tx.update(voteRef, { voteCount: FieldValue.increment(1) });
      } else {
        tx.set(voteRef, { voteCount: 1, createdAt: FieldValue.serverTimestamp() });
      }
    });

    // Save record in per-user history
    await dbAdmin.collection(`clubs/${slug}/userVotes`).doc(userId).set({
      userId,
      bookSlug,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Vote recorded' });
  } catch (err) {
    console.error('🔥 Error in vote endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record vote' },
      { status: 500 }
    );
  }
}
