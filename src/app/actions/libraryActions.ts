// app/actions/libraryActions.ts
'use server';

import { addBookToUserLibrary, removeBookFromUserLibrary } from '@/lib/userLibraryCache';

export async function updateLibraryCache(userId: string, bookId: string) {
  try {
    await addBookToUserLibrary(userId, bookId);
    console.log('✅ Library cache updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Library cache update failed:', error);
    return { success: false, error: String(error) };
  }
}

export async function removeFromLibraryCache(userId: string, bookId: string) {
  try {
    await removeBookFromUserLibrary(userId, bookId);
    console.log('✅ Book removed from library cache');
    return { success: true };
  } catch (error) {
    console.error('❌ Library cache removal failed:', error);
    return { success: false, error: String(error) };
  }
}