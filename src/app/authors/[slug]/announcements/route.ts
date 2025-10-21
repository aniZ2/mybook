import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Resolve author ID from slug or fallback to ID directly.
 */
async function resolveAuthorId(db: FirebaseFirestore.Firestore, slugOrId: string): Promise<string | null> {
  // Try direct doc (ID)
  const directRef = db.collection('authors').doc(slugOrId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directSnap.id;

  // Try slug
  const slugQuery = await db.collection('authors').where('slug', '==', slugOrId).limit(1).get();
  if (!slugQuery.empty) return slugQuery.docs[0].id;

  return null;
}

/* ───────────────────────────────────────────────
   GET ANNOUNCEMENTS (list all)
─────────────────────────────────────────────── */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const authorId = await resolveAuthorId(db, params.slug);
    if (!authorId) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const snap = await db
      .collection(`authors/${authorId}/announcements`)
      .orderBy('createdAt', 'desc')
      .get();

    const announcements = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ announcements });
  } catch (err: any) {
    console.error('🔥 GET error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   CREATE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const { title, message, authorId: rawAuthorId } = await req.json();

    if (!title || !message)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const ref = db.collection(`authors/${authorId}/announcements`).doc();
    await ref.set({
      title,
      message,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('🔥 POST error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   UPDATE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const { announcementId, title, message, authorId: rawAuthorId } = await req.json();
    if (!announcementId)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const ref = db.doc(`authors/${authorId}/announcements/${announcementId}`);
    await ref.update({ title, message, updatedAt: new Date() });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('🔥 PUT error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   DELETE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const { announcementId, authorId: rawAuthorId } = await req.json();
    if (!announcementId)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) return NextResponse.json({ error: 'Author not found' }, { status: 404 });

    const ref = db.doc(`authors/${authorId}/announcements/${announcementId}`);
    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('🔥 DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
