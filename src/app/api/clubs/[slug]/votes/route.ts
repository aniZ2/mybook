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
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    console.log('✅ User authenticated:', userId);

    // Parse book
    const { bookSlug } = await req.json();
    if (!bookSlug)
      return NextResponse.json({ error: 'Missing bookSlug' }, { status: 400 });

    console.log('📖 Vote request - User:', userId, 'Book:', bookSlug);

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });

    const clubData = clubSnap.data();
    if (!clubData?.roundActive)
      return NextResponse.json({ error: 'Voting is not active' }, { status: 400 });

    // ────────────── Check if already voted
    const userVoteRef = dbAdmin.collection(`clubs/${slug}/userVotes`).doc(userId);
    const userVoteSnap = await userVoteRef.get();

    console.log('🗳️ Previous vote exists:', userVoteSnap.exists);

    if (userVoteSnap.exists) {
      const previousBookSlug = userVoteSnap.data()?.bookSlug;
      console.log('📚 Previous book:', previousBookSlug);
      
      // If voting for the same book, just return success
      if (previousBookSlug === bookSlug) {
        return NextResponse.json({ 
          success: true, 
          message: 'Vote already recorded for this book' 
        });
      }

      // ────────────── Change vote: decrement old, increment new
      console.log('🔄 Changing vote from', previousBookSlug, 'to', bookSlug);
      
      await dbAdmin.runTransaction(async (tx) => {
        // ✅ ALL READS FIRST
        const oldVoteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(previousBookSlug);
        const newVoteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(bookSlug);
        
        const oldVoteSnap = await tx.get(oldVoteRef);
        const newVoteSnap = await tx.get(newVoteRef);
        
        // ✅ THEN ALL WRITES
        // Decrement vote on previous book
        if (oldVoteSnap.exists) {
          const currentCount = oldVoteSnap.data()?.voteCount || 0;
          if (currentCount > 0) {
            tx.update(oldVoteRef, { voteCount: FieldValue.increment(-1) });
          }
        }

        // Increment vote on new book
        if (newVoteSnap.exists) {
          tx.update(newVoteRef, { voteCount: FieldValue.increment(1) });
        } else {
          tx.set(newVoteRef, { 
            voteCount: 1, 
            createdAt: FieldValue.serverTimestamp() 
          });
        }

        // Update user's vote record
        tx.update(userVoteRef, {
          bookSlug,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Vote changed successfully' 
      });
    }

    // ────────────── First time voting
    console.log('🆕 First time voting for', bookSlug);
    
    await dbAdmin.runTransaction(async (tx) => {
      // ✅ ALL READS FIRST
      const voteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(bookSlug);
      const voteSnap = await tx.get(voteRef);
      
      // ✅ THEN ALL WRITES
      if (voteSnap.exists) {
        tx.update(voteRef, { voteCount: FieldValue.increment(1) });
      } else {
        tx.set(voteRef, { 
          voteCount: 1, 
          createdAt: FieldValue.serverTimestamp() 
        });
      }

      // Save record in per-user history
      tx.set(userVoteRef, {
        userId,
        bookSlug,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Vote recorded' 
    });
  } catch (err) {
    console.error('🔥 Error in vote endpoint:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record vote' },
      { status: 500 }
    );
  }
}

// GET all vote counts
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    const votesSnap = await dbAdmin
      .collection(`clubs/${slug}/votes`)
      .get();

    const votes: Record<string, number> = {};
    votesSnap.forEach((doc) => {
      votes[doc.id] = doc.data().voteCount || 0;
    });

    return NextResponse.json({ votes });
  } catch (err) {
    console.error('Error fetching votes:', err);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}