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
  { params }: { params: { slug: string } }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    // Parse request body
    const body = await req.json();
    const {
      title,
      author,
      coverUrl,
      isbn,
      setAsCurrentlyReading = false,
      nominateForNext = false,
      resetRound = false,
      bookSlugOverride,
    } = body;

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    const club = clubSnap.data();

    // Only owner can modify books
    if (club?.ownerUid !== userId)
      return NextResponse.json(
        { error: 'Only admins can modify club books' },
        { status: 403 }
      );

    // ─────────────────────────────
    //  🟦 ROUND RESET
    // ─────────────────────────────
    if (resetRound) {
      const votesSnap = await dbAdmin.collection(`clubs/${slug}/votes`).get();
      const deletions = votesSnap.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletions);

      await clubRef.update({
        nextCandidates: [],
        roundActive: false,
        roundEndedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Voting round reset' });
    }

    // ─────────────────────────────
    //  🟨 NOMINATE BOOK FOR VOTE
    // ─────────────────────────────
    if (nominateForNext && (title || bookSlugOverride)) {
      const bookSlug = bookSlugOverride || slugifyTitle(title);
      const bookRef = dbAdmin.collection('books').doc(bookSlug);
      const bookSnap = await bookRef.get();

      if (!bookSnap.exists && title) {
        await bookRef.set({
          slug: bookSlug,
          title,
          authorName: author || 'Unknown',
          coverUrl: coverUrl || null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

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

    // ─────────────────────────────
    //  🟩 DECLARE WINNER / CURRENT
    // ─────────────────────────────
    if (setAsCurrentlyReading && (title || bookSlugOverride)) {
      const bookSlug = bookSlugOverride || slugifyTitle(title);

      const votesSnap = await dbAdmin.collection(`clubs/${slug}/votes`).get();
      const deletions = votesSnap.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletions);

      const updates: any = {
        currentBookId: bookSlug,
        nextCandidates: [],
        roundActive: false,
        roundEndedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (club?.currentBookId && club.currentBookId !== bookSlug) {
        updates.pastBookIds = FieldValue.arrayUnion(club.currentBookId);
      }

      await clubRef.update(updates);

      const bookRef = dbAdmin.collection('books').doc(bookSlug);
      await bookRef.set(
        {
          slug: bookSlug,
          title,
          authorName: author,
          coverUrl: coverUrl || null,
          clubsReading: FieldValue.arrayUnion(slug),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        message: `Book "${title}" declared as next read.`,
      });
    }

    // ─────────────────────────────
    //  🟦 DEFAULT: ADD TO LIBRARY
    // ─────────────────────────────
    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author required' },
        { status: 400 }
      );
    }

    const bookSlug = slugifyTitle(title);
    const bookRef = dbAdmin.collection('books').doc(bookSlug);

    await bookRef.set(
      {
        slug: bookSlug,
        title,
        authorName: author,
        coverUrl: coverUrl || null,
        meta: isbn ? { isbn13: isbn } : {},
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

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
    console.error('Error in POST /api/clubs/[slug]/books:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

/* ─────────────── GET /api/clubs/[slug]/books ─────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const dbAdmin = getAdminDb();
    const { slug } = params;

    const clubRef = dbAdmin.collection('clubs').doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists)
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    const clubData = clubSnap.data();

    const currentBookId = clubData?.currentBookId;
    const pastBookIds = clubData?.pastBookIds || [];
    const nextCandidates = clubData?.nextCandidates || [];

    const books: any[] = [];
    const candidates: any[] = [];

    // Current
    if (currentBookId) {
      const s = await dbAdmin.collection('books').doc(currentBookId).get();
      if (s.exists) books.push({ id: s.id, slug: s.id, ...s.data(), isCurrentlyReading: true });
    }

    // Past
    if (pastBookIds.length > 0) {
      const snaps = await Promise.all(
        pastBookIds.map((id: string) => dbAdmin.collection('books').doc(id).get())
      );
      snaps.forEach((s) => s.exists && books.push({ id: s.id, slug: s.id, ...s.data(), isCurrentlyReading: false }));
    }

    // Candidates
    if (nextCandidates.length > 0) {
      const snaps = await Promise.all(
        nextCandidates.map((id: string) => dbAdmin.collection('books').doc(id).get())
      );
      snaps.forEach((s) => s.exists && candidates.push({ id: s.id, slug: s.id, ...s.data(), isCandidate: true }));
    }

    return NextResponse.json({
      books,
      candidates,
      roundActive: clubData?.roundActive || false,
    });
  } catch (error) {
    console.error('Error fetching club books:', error);
    return NextResponse.json({ error: 'Failed to fetch club books' }, { status: 500 });
  }
}
