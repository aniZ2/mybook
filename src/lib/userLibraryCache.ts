// lib/userLibraryCache.ts
import { getAdminDb } from '@/lib/firebase-admin';

interface BookItem {
  id: string;
  title: string;
  authors: string[];
  savedAt?: any;
  coverUrl?: string;
  isbn?: string;
}

interface UserLibraryCache {
  books: BookItem[];
  lastUpdated: number;
}

const CACHE_COLLECTION = 'cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Get user's library from cache
export async function getUserLibrary(userId: string, forceRefresh = false): Promise<BookItem[]> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`user-${userId}-library`);
    
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() as UserLibraryCache;
        const now = Date.now();
        
        if (now - cacheData.lastUpdated < CACHE_DURATION) {
          console.log('✅ User library cache hit (1 read)');
          return cacheData.books;
        }
        
        console.log('⏰ User library cache expired (7 days old), refreshing...');
      }
    }

    console.log('📚 User library cache miss - fetching all books...');
    
    // Fetch all books from user's library
    const librarySnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('library')
      .orderBy('savedAt', 'desc')
      .get();
    
    const books: BookItem[] = librarySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Unknown Title',
        authors: data.authors || [],
        savedAt: data.savedAt,
        coverUrl: data.coverUrl || '',
        isbn: data.isbn || '',
      };
    });

    // Cache the library
    await cacheRef.set({
      books,
      lastUpdated: Date.now(),
    });

    console.log(`✅ Cached ${books.length} books for user (${librarySnapshot.size} reads + 1 write)`);
    
    return books;
  } catch (error) {
    console.error('❌ Error getting user library:', error);
    throw error;
  }
}

// Add book to user's library cache
export async function addBookToUserLibrary(userId: string, bookId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`user-${userId}-library`);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No cache exists, doing full refresh');
      await getUserLibrary(userId, true);
      return;
    }

    // Fetch just the new book (1 read!)
    const bookDoc = await db
      .collection('users')
      .doc(userId)
      .collection('library')
      .doc(bookId)
      .get();
    
    if (!bookDoc.exists) {
      console.error('❌ Book not found in library');
      return;
    }

    const data = bookDoc.data()!;
    const newBook: BookItem = {
      id: bookDoc.id,
      title: data.title || 'Unknown Title',
      authors: data.authors || [],
      savedAt: data.savedAt,
      coverUrl: data.coverUrl || '',
      isbn: data.isbn || '',
    };

    const cacheData = cacheDoc.data() as UserLibraryCache;
    const updatedBooks = [newBook, ...cacheData.books];

    await cacheRef.update({
      books: updatedBooks,
      lastUpdated: Date.now(),
    });

    console.log('✅ Added book to user library cache (1 read + 1 write)');
  } catch (error) {
    console.error('❌ Error adding book to cache:', error);
  }
}

// Remove book from cache
export async function removeBookFromUserLibrary(userId: string, bookId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`user-${userId}-library`);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No cache to remove from');
      return;
    }

    const cacheData = cacheDoc.data() as UserLibraryCache;
    const updatedBooks = cacheData.books.filter(book => book.id !== bookId);

    await cacheRef.update({
      books: updatedBooks,
      lastUpdated: Date.now(),
    });

    console.log('✅ Removed book from user library cache (0 reads + 1 write)');
  } catch (error) {
    console.error('❌ Error removing book from cache:', error);
  }
}