// app/actions/reviewActions.ts
'use server';

import { 
  addReviewToCache, 
  updateReviewInCache, 
  removeReviewFromCache 
} from '@/lib/reviewsCache';
import { revalidatePath } from 'next/cache';

export async function updateReviewCache(bookSlug: string, reviewId: string) {
  try {
    await addReviewToCache(bookSlug, reviewId);
    revalidatePath(`/books/${bookSlug}`);
    revalidatePath(`/api/books/${bookSlug}/reviews`);
    
    console.log('✅ Review cache updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Review cache update failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function editReviewCache(bookSlug: string, reviewId: string) {
  try {
    await updateReviewInCache(bookSlug, reviewId);
    revalidatePath(`/books/${bookSlug}`);
    revalidatePath(`/api/books/${bookSlug}/reviews`);
    
    console.log('✅ Review edited in cache');
    return { success: true };
  } catch (error) {
    console.error('❌ Review edit cache failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteReviewCache(bookSlug: string, reviewId: string) {
  try {
    await removeReviewFromCache(bookSlug, reviewId);
    revalidatePath(`/books/${bookSlug}`);
    revalidatePath(`/api/books/${bookSlug}/reviews`);
    
    console.log('✅ Review deleted from cache');
    return { success: true };
  } catch (error) {
    console.error('❌ Review delete cache failed:', error);
    return { success: false, error: String(error) };
  }
}
