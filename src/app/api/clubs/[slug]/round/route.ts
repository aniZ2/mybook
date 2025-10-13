import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });

    const clubData = clubSnap.data();
    if (clubData?.ownerUid !== userId)
      return NextResponse.json({ error: 'Only admins can manage voting' }, { status: 403 });

    const { action } = await req.json();

    if (action === 'start') {
      await clubRef.update({
        roundActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: 'Voting round started' });
    }

    if (action === 'declare') {
      // Fetch votes
      const votesSnap = await dbAdmin.collection(`clubs/${slug}/votes`).get();
      if (votesSnap.empty)
        return NextResponse.json({ error: 'No votes recorded' }, { status: 400 });

      // Find highest-voted book
      let winner = '';
      let topVotes = 0;
      votesSnap.forEach((doc) => {
        const count = doc.data().voteCount || 0;
        if (count > topVotes) {
          topVotes = count;
          winner = doc.id;
        }
      });

      if (!winner)
        return NextResponse.json({ error: 'No valid winner found' }, { status: 400 });

      await clubRef.update({
        currentBookId: winner,
        roundActive: false,
        pastBookIds: FieldValue.arrayUnion(winner),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await dbAdmin.collection(`clubs/${slug}/votes`).get().then((snap) =>
        snap.forEach((d) => d.ref.delete())
      );

      return NextResponse.json({ success: true, message: `Winner declared: ${winner}` });
    }

    if (action === 'reset') {
      await dbAdmin.collection(`clubs/${slug}/votes`).get().then((snap) =>
        snap.forEach((d) => d.ref.delete())
      );

      await clubRef.update({
        roundActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Voting round reset' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('🔥 Error in round control:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update round' },
      { status: 500 }
    );
  }
}
