// lib/clubsCache.ts
import { getAdminDb } from '@/lib/firebase-admin';

interface Club {
  id: string;
  slug?: string | null;
  name: string;
  description?: string;
  coverImage?: string;
  memberCount?: number;
  isPublic?: boolean;
  createdBy?: string;
  category?: string;
  booksCount?: number;
}

interface ClubsCache {
  clubs: Club[];
  lastUpdated: number;
}

const CACHE_COLLECTION = 'cache';
const CACHE_DOC_ID = 'clubs-list';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Get all clubs (from cache)
export async function getClubs(forceRefresh = false): Promise<Club[]> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() as ClubsCache;
        const now = Date.now();
        
        if (now - cacheData.lastUpdated < CACHE_DURATION) {
          console.log('✅ Clubs cache hit (1 read)');
          return cacheData.clubs;
        }
        
        console.log('⏰ Clubs cache expired (7 days old), refreshing...');
      }
    }

    console.log('📚 Clubs cache miss - fetching all clubs...');
    
    const clubsSnapshot = await db
      .collection('clubs')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const clubs: Club[] = clubsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: data.slug || null,
        name: data.name || 'Unnamed Club',
        description: data.description || '',
        coverImage: data.iconUrl || data.coverImage || '',
        memberCount: data.membersCount || data.memberCount || 0,
        isPublic: data.isPublic ?? true,
        createdBy: data.createdBy || data.ownerUid || '',
        category: data.category || 'general',
        booksCount: data.booksCount || 0,
      };
    });

    // Update cache
    await cacheRef.set({
      clubs,
      lastUpdated: Date.now(),
    });

    console.log(`✅ Clubs cache updated: ${clubs.length} clubs (${clubsSnapshot.size} reads + 1 write)`);
    
    return clubs;
  } catch (error) {
    console.error('❌ Error getting clubs:', error);
    throw error;
  }
}

// Add new club to cache
export async function addClubToCache(clubId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No clubs cache exists, doing full refresh');
      await getClubs(true);
      return;
    }

    const clubDoc = await db.collection('clubs').doc(clubId).get();
    
    if (!clubDoc.exists) {
      console.error('❌ Club not found:', clubId);
      return;
    }

    const data = clubDoc.data()!;
    const newClub: Club = {
      id: clubDoc.id,
      slug: data.slug || null,
      name: data.name || 'Unnamed Club',
      description: data.description || '',
      coverImage: data.iconUrl || data.coverImage || '',
      memberCount: data.membersCount || data.memberCount || 0,
      isPublic: data.isPublic ?? true,
      createdBy: data.createdBy || data.ownerUid || '',
      category: data.category || 'general',
      booksCount: data.booksCount || 0,
    };

    const cacheData = cacheDoc.data() as ClubsCache;
    const updatedClubs = [newClub, ...cacheData.clubs];

    await cacheRef.update({
      clubs: updatedClubs,
      lastUpdated: Date.now(),
    });

    console.log('✅ Added club to cache (1 read + 1 write):', newClub.name);
  } catch (error) {
    console.error('❌ Error adding club to cache:', error);
  }
}

// Remove club from cache
export async function removeClubFromCache(clubId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No clubs cache to remove from');
      return;
    }

    const cacheData = cacheDoc.data() as ClubsCache;
    const updatedClubs = cacheData.clubs.filter(club => club.id !== clubId);

    await cacheRef.update({
      clubs: updatedClubs,
      lastUpdated: Date.now(),
    });

    console.log('✅ Removed club from cache (0 reads + 1 write)');
  } catch (error) {
    console.error('❌ Error removing club from cache:', error);
  }
}

// Update club in cache
export async function updateClubInCache(
  clubId: string, 
  updates: Partial<Club>
): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No clubs cache to update');
      return;
    }

    const cacheData = cacheDoc.data() as ClubsCache;
    const updatedClubs = cacheData.clubs.map(club => 
      club.id === clubId ? { ...club, ...updates } : club
    );

    await cacheRef.update({
      clubs: updatedClubs,
      lastUpdated: Date.now(),
    });

    console.log('✅ Updated club in cache (0 reads + 1 write)');
  } catch (error) {
    console.error('❌ Error updating club in cache:', error);
  }
}