// lib/booksCache.ts
import { getAdminDb } from '@/lib/firebase-admin';

interface Book {
  id: string;
  slug: string;
  title: string;
  authorName?: string;
  authorId?: string;
  coverUrl?: string;
  description?: string;
  isbn?: string;
  createdAt?: any;
}

interface BooksCache {
  books: Book[];
  lastUpdated: number;
}

const CACHE_COLLECTION = 'cache';
const CACHE_DOC_ID = 'books-list';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Get recent books (from cache)
export async function getRecentBooks(limitCount = 30, forceRefresh = false): Promise<Book[]> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() as BooksCache;
        const now = Date.now();
        
        if (now - cacheData.lastUpdated < CACHE_DURATION) {
          console.log('✅ Books cache hit (1 read)');
          return cacheData.books.slice(0, limitCount);
        }
        
        console.log('⏰ Books cache expired (7 days old), refreshing...');
      }
    }

    console.log('📚 Books cache miss - fetching recent books...');
    
    const booksSnapshot = await db
      .collection('books')
      .orderBy('createdAt', 'desc')
      .limit(100) // Cache 100, serve 30 by default
      .get();
    
    const books: Book[] = booksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: data.slug || doc.id,
        title: data.title || 'Untitled',
        authorName: data.authorName || 'Unknown Author',
        authorId: data.authorId || '',
        coverUrl: data.coverUrl || '',
        description: data.description || '',
        isbn: data.isbn || '',
        createdAt: data.createdAt,
      };
    });

    // Update cache
    await cacheRef.set({
      books,
      lastUpdated: Date.now(),
    });

    console.log(`✅ Books cache updated: ${books.length} books (${booksSnapshot.size} reads + 1 write)`);
    
    return books.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Error getting books:', error);
    throw error;
  }
}

// Add new book to cache
export async function addBookToCache(bookId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No books cache exists, doing full refresh');
      await getRecentBooks(100, true);
      return;
    }

    const bookDoc = await db.collection('books').doc(bookId).get();
    
    if (!bookDoc.exists) {
      console.error('❌ Book not found:', bookId);
      return;
    }

    const data = bookDoc.data()!;
    const newBook: Book = {
      id: bookDoc.id,
      slug: data.slug || bookDoc.id,
      title: data.title || 'Untitled',
      authorName: data.authorName || 'Unknown Author',
      authorId: data.authorId || '',
      coverUrl: data.coverUrl || '',
      description: data.description || '',
      isbn: data.isbn || '',
      createdAt: data.createdAt,
    };

    const cacheData = cacheDoc.data() as BooksCache;
    const updatedBooks = [newBook, ...cacheData.books].slice(0, 100); // Keep only 100

    await cacheRef.update({
      books: updatedBooks,
      lastUpdated: Date.now(),
    });

    console.log('✅ Added book to cache (1 read + 1 write):', newBook.title);
  } catch (error) {
    console.error('❌ Error adding book to cache:', error);
  }
}