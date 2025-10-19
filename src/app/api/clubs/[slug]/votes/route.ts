import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/clubs/[slug]/votes
 * Body: { bookSlug: string }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = await context.params;

    // Verify auth
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.uid;
    console.log('✅ User authenticated:', userId);

    // Parse book
    const body = await req.json();
    const { bookSlug } = body;
    
    console.log('📦 Request body:', body);
    
    if (!bookSlug) {
      console.log('❌ No bookSlug provided');
      return NextResponse.json({ error: 'Missing bookSlug' }, { status: 400 });
    }

    console.log('📖 Vote request - Club:', slug, 'User:', userId, 'Book:', bookSlug);

    // Check club exists
    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    
    if (!clubSnap.exists) {
      console.log('❌ Club not found:', slug);
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    const clubData = clubSnap.data();
    console.log('📋 Club data:', { 
      roundActive: clubData?.roundActive,
      nextCandidates: clubData?.nextCandidates 
    });

    if (!clubData?.roundActive) {
      console.log('❌ Voting not active');
      return NextResponse.json({ error: 'Voting is not active' }, { status: 400 });
    }

    // Check if book is a valid candidate
    const nextCandidates: string[] = clubData?.nextCandidates || [];
    if (!nextCandidates.includes(bookSlug)) {
      console.log('❌ Book not in candidates list:', bookSlug, 'Candidates:', nextCandidates);
      return NextResponse.json({ error: 'Book is not a valid candidate' }, { status: 400 });
    }

    // ────────────── Check if user already voted
    const userVoteRef = dbAdmin.collection(`clubs/${slug}/userVotes`).doc(userId);
    const userVoteSnap = await userVoteRef.get();

    console.log('🗳️ User vote check:', {
      exists: userVoteSnap.exists,
      data: userVoteSnap.exists ? userVoteSnap.data() : null
    });

    const previousBookSlug = userVoteSnap.exists ? userVoteSnap.data()?.bookSlug : null;

    // If voting for the same book, return success
    if (previousBookSlug === bookSlug) {
      console.log('ℹ️ User already voted for this book');
      return NextResponse.json({ 
        success: true, 
        message: 'Vote already recorded for this book' 
      });
    }

    // ────────────── Handle the vote
    console.log('🔄 Processing vote...');

    if (previousBookSlug) {
      // User is CHANGING their vote
      console.log('🔄 Changing vote from', previousBookSlug, 'to', bookSlug);

      const oldVoteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(previousBookSlug);
      const newVoteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(bookSlug);

      // Read old and new vote docs
      const oldVoteSnap = await oldVoteRef.get();
      const newVoteSnap = await newVoteRef.get();

      console.log('📊 Old vote doc:', {
        exists: oldVoteSnap.exists,
        data: oldVoteSnap.exists ? oldVoteSnap.data() : null
      });
      console.log('📊 New vote doc:', {
        exists: newVoteSnap.exists,
        data: newVoteSnap.exists ? newVoteSnap.data() : null
      });

      // Decrement old book
      if (oldVoteSnap.exists) {
        const oldData = oldVoteSnap.data();
        const oldCount = oldData?.voteCount || 0;
        const oldVoterIds: string[] = oldData?.voterIds || [];
        
        console.log('⬇️ Decrementing old book. Current count:', oldCount);
        
        await oldVoteRef.update({
          voteCount: Math.max(0, oldCount - 1),
          voterIds: oldVoterIds.filter((id: string) => id !== userId),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Increment new book
      if (newVoteSnap.exists) {
        const newData = newVoteSnap.data();
        const newCount = newData?.voteCount || 0;
        
        console.log('⬆️ Incrementing new book. Current count:', newCount);
        
        await newVoteRef.update({
          voteCount: newCount + 1,
          voterIds: FieldValue.arrayUnion(userId),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        console.log('🆕 Creating new vote doc for', bookSlug);
        
        await newVoteRef.set({
          bookSlug,
          voteCount: 1,
          voterIds: [userId],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Update user vote record
      await userVoteRef.update({
        bookSlug,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log('✅ Vote changed successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Vote changed successfully' 
      });

    } else {
      // User is voting for the FIRST TIME
      console.log('🆕 First time vote for', bookSlug);

      const voteRef = dbAdmin.collection(`clubs/${slug}/votes`).doc(bookSlug);
      const voteSnap = await voteRef.get();

      console.log('📊 Vote doc:', {
        exists: voteSnap.exists,
        data: voteSnap.exists ? voteSnap.data() : null
      });

      if (voteSnap.exists) {
        const voteData = voteSnap.data();
        const currentCount = voteData?.voteCount || 0;
        
        console.log('⬆️ Incrementing vote. Current count:', currentCount);
        
        await voteRef.update({
          voteCount: currentCount + 1,
          voterIds: FieldValue.arrayUnion(userId),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        console.log('🆕 Creating new vote doc');
        
        await voteRef.set({
          bookSlug,
          voteCount: 1,
          voterIds: [userId],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Create user vote record
      console.log('💾 Creating user vote record');
      await userVoteRef.set({
        userId,
        bookSlug,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log('✅ Vote recorded successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Vote recorded successfully' 
      });
    }

  } catch (err) {
    console.error('🔥 Error in vote endpoint:', err);
    console.error('🔥 Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record vote' },
      { status: 500 }
    );
  }
}

// GET all vote counts
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = await context.params;

    console.log('📊 Fetching votes for club:', slug);

    const votesSnap = await dbAdmin
      .collection(`clubs/${slug}/votes`)
      .get();

    console.log('📊 Found', votesSnap.size, 'vote documents');

    const votes: Record<string, number> = {};
    votesSnap.forEach((doc) => {
      const data = doc.data();
      votes[doc.id] = data?.voteCount || 0;
      console.log('📊 Vote doc:', doc.id, data);
    });

    return NextResponse.json({ votes });
  } catch (err) {
    console.error('❌ Error fetching votes:', err);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}