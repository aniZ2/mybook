// app/actions/clubActions.ts
'use server';

import { addClubToCache } from '@/lib/clubsCache';
import { revalidatePath } from 'next/cache';

export async function updateClubCache(clubId: string) {
  try {
    await addClubToCache(clubId);
    revalidatePath('/clubs');
    revalidatePath('/api/clubs');
    
    console.log('✅ Club cache updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Club cache update failed:', error);
    return { success: false, error: String(error) };
  }
}