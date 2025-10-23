// lib/authorsCache.ts
import { getAdminDb } from '@/lib/firebase-admin';

interface Author {
  id: string;
  slug?: string | null;
  name: string;
  bio?: string;
  photoUrl?: string;
  isPremium?: boolean;
  followersCount?: number;
  booksCount?: number;
}

interface AuthorsCache {
  authors: Author[];
  lastUpdated: number;
}

const CACHE_COLLECTION = 'cache';
const CACHE_DOC_ID = 'authors-list';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Get all authors (from Firestore cache)
export async function getAuthors(forceRefresh = false): Promise<Author[]> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() as AuthorsCache;
        const now = Date.now();
        
        // Check if cache is still valid (30 days)
        if (now - cacheData.lastUpdated < CACHE_DURATION) {
          console.log('✅ Firestore cache hit (1 read)');
          return cacheData.authors;
        }
        
        console.log('⏰ Firestore cache expired (30 days old), refreshing...');
      }
    }

    console.log('📚 Firestore cache miss - fetching all authors...');
    
    const authorsSnapshot = await db
      .collection('authors')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const authors: Author[] = authorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: data.slug || null,
        name: data.name || 'Unknown Author',
        bio: data.bio || '',
        photoUrl: data.photoUrl || '',
        isPremium: data.isPremium || false,
        followersCount: data.followersCount || 0,
        booksCount: data.booksCount || 0,
      };
    });

    // Update Firestore cache
    await cacheRef.set({
      authors,
      lastUpdated: Date.now(),
    });

    console.log(`✅ Firestore cache updated: ${authors.length} authors (${authorsSnapshot.size} reads + 1 write)`);
    
    return authors;
  } catch (error) {
    console.error('❌ Error getting authors:', error);
    throw error;
  }
}

// Add new author to Firestore cache (1 read + 1 write)
export async function addAuthorToCache(authorId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No Firestore cache exists, doing full refresh');
      await getAuthors(true);
      return;
    }

    const authorDoc = await db.collection('authors').doc(authorId).get();
    
    if (!authorDoc.exists) {
      console.error('❌ Author not found:', authorId);
      return;
    }

    const data = authorDoc.data()!;
    const newAuthor: Author = {
      id: authorDoc.id,
      slug: data.slug || null,
      name: data.name || 'Unknown Author',
      bio: data.bio || '',
      photoUrl: data.photoUrl || '',
      isPremium: data.isPremium || false,
      followersCount: data.followersCount || 0,
      booksCount: data.booksCount || 0,
    };

    const cacheData = cacheDoc.data() as AuthorsCache;
    const updatedAuthors = [newAuthor, ...cacheData.authors];

    await cacheRef.update({
      authors: updatedAuthors,
      lastUpdated: Date.now(),
    });

    console.log('✅ Added to Firestore cache (1 read + 1 write):', newAuthor.name);
  } catch (error) {
    console.error('❌ Error adding author to Firestore cache:', error);
  }
}

// Remove author from Firestore cache (1 read + 1 write)
export async function removeAuthorFromCache(authorId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No Firestore cache to remove from');
      return;
    }

    const cacheData = cacheDoc.data() as AuthorsCache;
    const updatedAuthors = cacheData.authors.filter(
      author => author.id !== authorId
    );

    await cacheRef.update({
      authors: updatedAuthors,
      lastUpdated: Date.now(),
    });

    console.log('✅ Removed from Firestore cache (1 read + 1 write)');
  } catch (error) {
    console.error('❌ Error removing author from Firestore cache:', error);
  }
}

// Update author in Firestore cache (1 read + 1 write)
export async function updateAuthorInCache(
  authorId: string, 
  updates: Partial<Author>
): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No Firestore cache to update');
      return;
    }

    const cacheData = cacheDoc.data() as AuthorsCache;
    const updatedAuthors = cacheData.authors.map(author => 
      author.id === authorId ? { ...author, ...updates } : author
    );

    await cacheRef.update({
      authors: updatedAuthors,
      lastUpdated: Date.now(),
    });

    console.log('✅ Updated in Firestore cache (1 read + 1 write)');
  } catch (error) {
    console.error('❌ Error updating author in Firestore cache:', error);
  }
}
