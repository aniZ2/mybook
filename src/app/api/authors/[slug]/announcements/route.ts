import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

/**
 * Resolve author ID from slug or fallback to ID directly.
 */
async function resolveAuthorId(db: FirebaseFirestore.Firestore, slugOrId: string): Promise<string | null> {
  try {
    // Try direct doc (ID)
    const directRef = db.collection('authors').doc(slugOrId);
    const directSnap = await directRef.get();
    if (directSnap.exists) return directSnap.id;

    // Try slug
    const slugQuery = await db.collection('authors').where('slug', '==', slugOrId).limit(1).get();
    if (!slugQuery.empty) return slugQuery.docs[0].id;

    return null;
  } catch (err) {
    console.error('Error resolving author ID:', err);
    return null;
  }
}

/**
 * Verify user authentication from request headers
 */
async function verifyAuth(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (err) {
    console.error('Auth verification error:', err);
    return null;
  }
}

/* ───────────────────────────────────────────────
   GET ANNOUNCEMENTS (list all)
─────────────────────────────────────────────── */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const authorId = await resolveAuthorId(db, params.slug);
    if (!authorId) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

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
    console.error('🔥 GET announcements error:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to fetch announcements',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   CREATE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { title, message, authorId: rawAuthorId } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both title and message are required'
      }, { status: 400 });
    }

    // Validate field lengths
    if (title.trim().length === 0 || message.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Title and message cannot be empty' 
      }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ 
        error: 'Title too long',
        details: 'Title must be 200 characters or less'
      }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ 
        error: 'Message too long',
        details: 'Message must be 5000 characters or less'
      }, { status: 400 });
    }

    // Resolve author ID
    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    // Create announcement document
    const announcementsRef = db.collection(`authors/${authorId}/announcements`);
    const newAnnouncementRef = announcementsRef.doc();
    
    const now = new Date();
    const announcementData = {
      title: title.trim(),
      message: message.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await newAnnouncementRef.set(announcementData);

    console.log(`✅ Announcement created: ${newAnnouncementRef.id} for author ${authorId}`);

    return NextResponse.json({ 
      success: true,
      announcementId: newAnnouncementRef.id
    }, { status: 201 });

  } catch (err: any) {
    console.error('🔥 POST announcement error:', err);
    return NextResponse.json({ 
      error: 'Failed to create announcement',
      message: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   UPDATE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { announcementId, title, message, authorId: rawAuthorId } = body;

    // Validate required fields
    if (!announcementId || !title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'announcementId, title, and message are required'
      }, { status: 400 });
    }

    // Resolve author ID
    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    // Update announcement
    const ref = db.doc(`authors/${authorId}/announcements/${announcementId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await ref.update({ 
      title: title.trim(), 
      message: message.trim(), 
      updatedAt: new Date() 
    });

    console.log(`✅ Announcement updated: ${announcementId}`);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('🔥 PUT announcement error:', err);
    return NextResponse.json({ 
      error: 'Failed to update announcement',
      message: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

/* ───────────────────────────────────────────────
   DELETE ANNOUNCEMENT
─────────────────────────────────────────────── */
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { announcementId, authorId: rawAuthorId } = body;

    // Validate required fields
    if (!announcementId) {
      return NextResponse.json({ 
        error: 'Missing required field',
        details: 'announcementId is required'
      }, { status: 400 });
    }

    // Resolve author ID
    const authorId = rawAuthorId || (await resolveAuthorId(db, params.slug));
    if (!authorId) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    // Delete announcement
    const ref = db.doc(`authors/${authorId}/announcements/${announcementId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await ref.delete();

    console.log(`✅ Announcement deleted: ${announcementId}`);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('🔥 DELETE announcement error:', err);
    return NextResponse.json({ 
      error: 'Failed to delete announcement',
      message: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}