import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

/* ─────────────── Helper ─────────────── */
function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ─────────────── POST /api/clubs/[slug]/books ─────────────── */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = await context.params;

    // 🔐 Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const {
      title,
      author,
      coverUrl,
      description,
      isbn,
      setAsCurrentlyReading = false,
      nominateForNext = false,
      resetRound = false,
      bookSlugOverride,
    } = body;

    console.log('📝 POST /api/clubs/[slug]/books - Body:', body);

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    const club = clubSnap.data();

    // 🔒 Verify admin privileges
    const memberDoc = await clubRef.collection('members').doc(userId).get();
    const memberData = memberDoc.exists ? memberDoc.data() : null;
    const isAdmin = memberData?.role === 'admin';
    const isOwner = club?.ownerUid === userId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Only admins can modify club books' },
        { status: 403 }
      );
    }

    /* ───────────── RESET ROUND ───────────── */
    if (resetRound) {
      const votesSnap = await dbAdmin.collection(`clubs/${slug}/votes`).get();
      const deletions = votesSnap.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletions);

      // ✅ Delete all nominated books when resetting
      const candidateDocs: string[] = club?.nextCandidates || [];
      await Promise.all(
        candidateDocs.map(async (id: string) => {
          const candidateRef = clubRef.collection('books').doc(id);
          await candidateRef.delete();
        })
      );

      await clubRef.update({
        nextCandidates: [],
        roundActive: false,
        roundEndedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Voting round reset' });
    }

    /* ───────────── NOMINATE FOR NEXT ───────────── */
    if (nominateForNext && (title || bookSlugOverride)) {
      const bookSlug = bookSlugOverride || slugifyTitle(title);
      
      console.log('🗳️ Nominating book:', bookSlug);
      
      // ✅ Only add to club subcollection
      const clubBookRef = clubRef.collection('books').doc(bookSlug);
      const bookData = {
        slug: bookSlug,
        title: title || 'Unknown Title',
        authorName: author || 'Unknown Author',
        coverUrl: coverUrl || null,
        description: description || null,
        status: 'nominated',
        nominatedBy: userId,
        nominatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await clubBookRef.set(bookData, { merge: true });

      console.log('✅ Book nominated in subcollection:', bookData);

      // update club metadata
      await clubRef.update({
        nextCandidates: FieldValue.arrayUnion(bookSlug),
        roundActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Book nominated for next read',
        slug: bookSlug,
      });
    }

    /* ───────────── DECLARE WINNER ───────────── */
    if (setAsCurrentlyReading && (title || bookSlugOverride)) {
      const bookSlug = bookSlugOverride || slugifyTitle(title);

      console.log('🏆 Declaring winner:', bookSlug);
      console.log('📦 Book data:', { title, author, coverUrl, description });

      // ✅ First, get existing book data from subcollection to preserve all fields
      const existingBookRef = clubRef.collection('books').doc(bookSlug);
      const existingBookSnap = await existingBookRef.get();
      const existingBookData = existingBookSnap.exists ? existingBookSnap.data() : {};

      console.log('📚 Existing book data:', existingBookData);

      // clear votes
      const votesSnap = await dbAdmin.collection(`clubs/${slug}/votes`).get();
      await Promise.all(votesSnap.docs.map((d) => d.ref.delete()));

      // prepare club updates
      const updates: any = {
        currentBookId: bookSlug,
        nextCandidates: [],
        roundActive: false,
        roundEndedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Move old current book to past
      if (club?.currentBookId && club.currentBookId !== bookSlug) {
        updates.pastBookIds = FieldValue.arrayUnion(club.currentBookId);
      }

      await clubRef.update(updates);

      // ✅ Update winner book in club subcollection - PRESERVE ALL DATA
      const winnerBookData = {
        slug: bookSlug,
        title: title || existingBookData?.title || 'Unknown Title',
        authorName: author || existingBookData?.authorName || 'Unknown Author',
        coverUrl: coverUrl !== undefined ? coverUrl : (existingBookData?.coverUrl || null),
        description: description !== undefined ? description : (existingBookData?.description || null),
        status: 'current',
        declaredWinnerAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      console.log('💾 Saving winner book data:', winnerBookData);

      await existingBookRef.set(winnerBookData, { merge: true });

      // ✅ Mark old current book as past in club subcollection
      if (club?.currentBookId && club.currentBookId !== bookSlug) {
        const oldClubBookRef = clubRef.collection('books').doc(club.currentBookId);
        await oldClubBookRef.set(
          {
            status: 'past',
            movedToPastAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // ✅ DELETE unchosen nominations (not just mark as removed)
      const candidateDocs: string[] = club?.nextCandidates || [];
      console.log('🗑️ Deleting unchosen nominations:', candidateDocs.filter((id: string) => id !== bookSlug));
      
      await Promise.all(
        candidateDocs.map(async (id: string) => {
          if (id !== bookSlug) {
            const candidateRef = clubRef.collection('books').doc(id);
            await candidateRef.delete(); // ✅ DELETE instead of marking as removed
            console.log('🗑️ Deleted:', id);
          }
        })
      );

      console.log('✅ Winner declared successfully');

      return NextResponse.json({
        success: true,
        message: `Book "${winnerBookData.title}" declared as next read.`,
        book: winnerBookData,
      });
    }

    /* ───────────── DEFAULT ADD ───────────── */
    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author required' },
        { status: 400 }
      );
    }

    const bookSlug = slugifyTitle(title);
    
    // ✅ Add to club subcollection
    const clubBookRef = clubRef.collection('books').doc(bookSlug);
    const newBookData = {
      slug: bookSlug,
      title,
      authorName: author,
      coverUrl: coverUrl || null,
      description: description || null,
      status: 'past',
      meta: isbn ? { isbn13: isbn } : {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await clubBookRef.set(newBookData, { merge: true });

    await clubRef.update({
      pastBookIds: FieldValue.arrayUnion(bookSlug),
      booksCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Book added to club library',
      slug: bookSlug,
    });
  } catch (error) {
    console.error('❌ Error in POST /api/clubs/[slug]/books:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

/* ─────────────── GET /api/clubs/[slug]/books ─────────────── */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = await context.params;

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    const clubData = clubSnap.data();

    const currentBookId: string | undefined = clubData?.currentBookId;
    const pastBookIds: string[] = clubData?.pastBookIds || [];
    const nextCandidates: string[] = clubData?.nextCandidates || [];

    console.log('📖 GET books - currentBookId:', currentBookId);
    console.log('📖 GET books - pastBookIds:', pastBookIds);
    console.log('📖 GET books - nextCandidates:', nextCandidates);

    const books: any[] = [];
    const candidates: any[] = [];

    // ✅ Read from club's books subcollection
    const clubBooksSnap = await clubRef.collection('books').get();
    const clubBooksMap = new Map();
    clubBooksSnap.forEach(doc => {
      const data = { id: doc.id, slug: doc.id, ...doc.data() };
      clubBooksMap.set(doc.id, data);
      console.log('📚 Book in subcollection:', doc.id, data);
    });

    // current
    if (currentBookId) {
      const bookData = clubBooksMap.get(currentBookId);
      if (bookData) {
        books.push({
          ...bookData,
          status: 'current',
          isCurrentlyReading: true,
        });
        console.log('✅ Current book found:', bookData);
      } else {
        console.warn('⚠️ Current book not found in subcollection:', currentBookId);
      }
    }

    // past - only include books that are in pastBookIds array
    if (pastBookIds.length > 0) {
      pastBookIds.forEach((id: string) => {
        const bookData = clubBooksMap.get(id);
        if (bookData && id !== currentBookId) {
          books.push({
            ...bookData,
            status: 'past',
            isCurrentlyReading: false,
          });
        }
      });
    }

    // nominations - only include books in nextCandidates array
    if (nextCandidates.length > 0) {
      nextCandidates.forEach((id: string) => {
        const bookData = clubBooksMap.get(id);
        if (bookData) {
          candidates.push({
            ...bookData,
            status: 'nominated',
            isCandidate: true,
          });
        }
      });
    }

    console.log('📤 Returning books:', books.length);
    console.log('📤 Returning candidates:', candidates.length);

    return NextResponse.json({
      books,
      candidates,
      roundActive: clubData?.roundActive || false,
    });
  } catch (error) {
    console.error('❌ Error fetching club books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club books' },
      { status: 500 }
    );
  }
}

/* ─────────────── DELETE /api/clubs/[slug]/books ─────────────── */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = await context.params;

    // Get bookSlug from query parameters
    const { searchParams } = new URL(req.url);
    const bookSlug = searchParams.get('bookSlug');

    if (!bookSlug) {
      return NextResponse.json({ error: 'bookSlug is required' }, { status: 400 });
    }

    console.log('🗑️ DELETE request for bookSlug:', bookSlug);

    // 🔐 Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    const club = clubSnap.data();

    // 🔒 Verify admin privileges
    const memberDoc = await clubRef.collection('members').doc(userId).get();
    const memberData = memberDoc.exists ? memberDoc.data() : null;
    const isAdmin = memberData?.role === 'admin';
    const isOwner = club?.ownerUid === userId;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Only admins can remove nominations' },
        { status: 403 }
      );
    }

    console.log('🗑️ Removing nomination:', bookSlug);

    // Remove from nextCandidates array
    await clubRef.update({
      nextCandidates: FieldValue.arrayRemove(bookSlug),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete from club's books subcollection
    const clubBookRef = clubRef.collection('books').doc(bookSlug);
    await clubBookRef.delete();

    // Delete associated votes
    const votesSnap = await dbAdmin
      .collection(`clubs/${slug}/votes`)
      .where('bookSlug', '==', bookSlug)
      .get();
    
    await Promise.all(votesSnap.docs.map((doc) => doc.ref.delete()));

    console.log('✅ Nomination removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Nomination removed successfully',
    });
  } catch (error) {
    console.error('❌ Error removing nomination:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}