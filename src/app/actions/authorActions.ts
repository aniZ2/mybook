// app/actions/authorActions.ts
'use server';

import { addAuthorToCache } from '@/lib/authorsCache';
import { revalidateAuthors } from '@/lib/revalidate';

export async function updateAuthorCache(authorId: string) {
  try {
    // Update Firestore cache
    await addAuthorToCache(authorId);
    console.log('✅ Firestore cache updated');
    
    // Clear Next.js cache
    await revalidateAuthors();
    console.log('✅ Next.js cache cleared');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Cache update failed:', error);
    return { success: false, error: String(error) };
  }
}