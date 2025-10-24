// app/api/library/route.ts
import { NextResponse } from 'next/server';
import { getUserLibrary } from '@/lib/userLibraryCache';
import { admin } from '@/lib/firebase-admin'; // Use your existing admin instance

export async function GET(request: Request) {
  try {
    // Get Firebase ID token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with your existing Firebase Admin instance
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get from cache
    const books = await getUserLibrary(userId);
    
    return NextResponse.json({ 
      books,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    
    // Handle auth errors
    if (error.code?.startsWith('auth/')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch library', details: error.message },
      { status: 500 }
    );
  }
}