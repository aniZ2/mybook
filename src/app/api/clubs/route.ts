import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!dbAdmin) {
      return NextResponse.json({ success: false, error: 'Admin SDK missing' }, { status: 500 });
    }

    const snapshot = await dbAdmin.collection('clubs').limit(50).get();

    const clubs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: data.slug || doc.id,
        name: data.name,
        description: data.description || '',
        iconUrl: data.iconUrl || '',
        membersCount: data.membersCount || 0,
        booksCount: data.booksCount || 0,
        category: data.category || 'general',
      };
    });

    return NextResponse.json({ success: true, clubs }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('🔥 Clubs API error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
