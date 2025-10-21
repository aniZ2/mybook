import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = await req.json();
    const authorId = params.slug;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    console.log(`📝 Updating slug for author ${authorId} to: ${slug}`);

    const db = getAdminDb();
    
    await db.collection('authors').doc(authorId).update({
      slug: slug,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Slug updated successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error updating slug:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update slug' },
      { status: 500 }
    );
  }
}