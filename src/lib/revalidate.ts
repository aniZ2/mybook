// lib/revalidate.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateAuthors() {
  try {
    // Revalidate both the page and API route
    revalidatePath('/authors');
    revalidatePath('/api/authors');
    
    console.log('✅ Authors cache revalidated at:', new Date().toISOString());
    
    return { success: true };
  } catch (error) {
    console.error('❌ Revalidation error:', error);
    return { success: false, error: String(error) };
  }
}