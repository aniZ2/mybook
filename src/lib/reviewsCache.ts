// lib/reviewsCache.ts
import { getAdminDb } from '@/lib/firebase-admin';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: any;
}

interface ReviewsCache {
  reviews: Review[];
  lastUpdated: number;
}

const CACHE_COLLECTION = 'cache';
const CACHE_DURATION = 180 * 24 * 60 * 60 * 1000; // 6 months

/* ──────────────────────────────────────────────── */
/* 📖 Get Reviews: from cache or Firestore          */
/* ──────────────────────────────────────────────── */
export async function getBookReviews(bookSlug: string, forceRefresh = false): Promise<Review[]> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`book-${bookSlug}-reviews`);
    
    if (!forceRefresh) {
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data() as ReviewsCache;
        const now = Date.now();
        
        if (now - cacheData.lastUpdated < CACHE_DURATION) {
          console.log('✅ Reviews cache hit (1 read)');
          return cacheData.reviews;
        }
        
        console.log('⏰ Reviews cache expired (6 months old), refreshing...');
      }
    }

    console.log('📚 Reviews cache miss - fetching all reviews...');
    
    const reviewsSnap = await db
      .collection('books')
      .doc(bookSlug)
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .get();
    
    const reviews: Review[] = reviewsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Review));

    // Cache reviews
    await cacheRef.set({
      reviews,
      lastUpdated: Date.now(),
    });

    console.log(`✅ Cached ${reviews.length} reviews for 6 months (${reviewsSnap.size} reads + 1 write)`);
    
    return reviews;
  } catch (error) {
    console.error('❌ Error getting reviews:', error);
    throw error;
  }
}

/* ──────────────────────────────────────────────── */
/* ➕ Add Review: insert new review into cache      */
/* ──────────────────────────────────────────────── */
export async function addReviewToCache(bookSlug: string, reviewId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`book-${bookSlug}-reviews`);
    const cacheDoc = await cacheRef.get();
    
    if (!cacheDoc.exists) {
      console.log('⚠️ No reviews cache, doing full refresh');
      await getBookReviews(bookSlug, true);
      return;
    }

    const reviewDoc = await db
      .collection('books')
      .doc(bookSlug)
      .collection('reviews')
      .doc(reviewId)
      .get();
    
    if (!reviewDoc.exists) {
      console.error('❌ Review not found');
      return;
    }

    const newReview: Review = {
      id: reviewDoc.id,
      ...reviewDoc.data()
    } as Review;

    const cacheData = cacheDoc.data() as ReviewsCache;
    const updatedReviews = [newReview, ...cacheData.reviews];

    await cacheRef.update({
      reviews: updatedReviews,
      lastUpdated: Date.now(),
    });

    console.log('✅ Added review to cache');
  } catch (error) {
    console.error('❌ Error adding review to cache:', error);
  }
}

/* ──────────────────────────────────────────────── */
/* 🔄 Edit Review: update cached review in place    */
/* ──────────────────────────────────────────────── */
export async function updateReviewInCache(bookSlug: string, reviewId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`book-${bookSlug}-reviews`);
    const cacheSnap = await cacheRef.get();
    
    if (!cacheSnap.exists) {
      console.log('⚠️ No cache found, refreshing...');
      await getBookReviews(bookSlug, true);
      return;
    }
    
    const reviewSnap = await db
      .collection('books')
      .doc(bookSlug)
      .collection('reviews')
      .doc(reviewId)
      .get();
    
    if (!reviewSnap.exists) {
      console.warn('⚠️ Review not found during cache update:', reviewId);
      return;
    }
    
    const updatedReview = { id: reviewSnap.id, ...reviewSnap.data() } as Review;
    const cacheData = cacheSnap.data() as ReviewsCache;
    const newReviews = cacheData.reviews.map((r) =>
      r.id === reviewId ? updatedReview : r
    );
    
    await cacheRef.update({
      reviews: newReviews,
      lastUpdated: Date.now(),
    });
    
    console.log(`🟡 Updated review "${reviewId}" in cache for ${bookSlug}`);
  } catch (error) {
    console.error('❌ Error updating review cache:', error);
  }
}

/* ──────────────────────────────────────────────── */
/* 🗑️ Delete Review: remove it from cache           */
/* ──────────────────────────────────────────────── */
export async function removeReviewFromCache(bookSlug: string, reviewId: string): Promise<void> {
  try {
    const db = getAdminDb();
    const cacheRef = db.collection(CACHE_COLLECTION).doc(`book-${bookSlug}-reviews`);
    const cacheSnap = await cacheRef.get();
    
    if (!cacheSnap.exists) return;
    
    const cacheData = cacheSnap.data() as ReviewsCache;
    const filtered = cacheData.reviews.filter((r) => r.id !== reviewId);
    
    await cacheRef.update({
      reviews: filtered,
      lastUpdated: Date.now(),
    });
    
    console.log(`🗑️ Removed review "${reviewId}" from cache for ${bookSlug}`);
  } catch (error) {
    console.error('❌ Error removing review from cache:', error);
  }
}