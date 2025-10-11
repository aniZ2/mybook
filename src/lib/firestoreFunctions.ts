import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { getDbOrThrow } from './firebase';
import { BookDoc, AuthorDoc } from '@/types/firestore';

/* ─────────── Utility: Increment Helper ─────────── */
export async function incrementField(
  path: string,
  field: string,
  amount: number
) {
  const db = getDbOrThrow(); // ✅ non-null Firestore
  try {
    const ref = doc(db, path);
    await updateDoc(ref, {
      [field]: increment(amount),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to increment ${field} in ${path}:`, err);
  }
}

/* ─────────── Likes ─────────── */
export async function toggleLike(
  bookId: string,
  userId: string,
  alreadyLiked: boolean
) {
  const db = getDbOrThrow();
  const likeRef = doc(db, `books/${bookId}/likes/${userId}`);
  const bookRef = doc(db, `books/${bookId}`);

  try {
    if (alreadyLiked) {
      await deleteDoc(likeRef);
      await updateDoc(bookRef, { likesCount: increment(-1) });
    } else {
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(bookRef, { likesCount: increment(1) });
    }
    await updateTrendingScore(bookId);
  } catch (err) {
    console.error('toggleLike failed:', err);
  }
}

/* ─────────── Saves ─────────── */
export async function toggleSave(
  bookId: string,
  userId: string,
  alreadySaved: boolean
) {
  const db = getDbOrThrow();
  const saveRef = doc(db, `users/${userId}/savedBooks/${bookId}`);
  const bookRef = doc(db, `books/${bookId}`);

  try {
    if (alreadySaved) {
      await deleteDoc(saveRef);
      await updateDoc(bookRef, { savesCount: increment(-1) });
    } else {
      await setDoc(saveRef, { bookId, savedAt: serverTimestamp() });
      await updateDoc(bookRef, { savesCount: increment(1) });
    }
    await updateTrendingScore(bookId);
  } catch (err) {
    console.error('toggleSave failed:', err);
  }
}

/* ─────────── Trending Score ─────────── */
export async function updateTrendingScore(bookId: string) {
  const db = getDbOrThrow();
  const ref = doc(db, `books/${bookId}`);
  try {
    await updateDoc(ref, {
      trendingScore: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('updateTrendingScore failed:', err);
  }
}

/* ─────────── Author Follower Logic ─────────── */
export async function toggleFollowAuthor(
  authorId: string,
  userId: string,
  alreadyFollowing: boolean
) {
  const db = getDbOrThrow();
  const followRef = doc(db, `authors/${authorId}/followers/${userId}`);
  const authorRef = doc(db, `authors/${authorId}`);

  try {
    if (alreadyFollowing) {
      await deleteDoc(followRef);
      await updateDoc(authorRef, { followersCount: increment(-1) });
    } else {
      await setDoc(followRef, { userId, followedAt: serverTimestamp() });
      await updateDoc(authorRef, { followersCount: increment(1) });
    }
  } catch (err) {
    console.error('toggleFollowAuthor failed:', err);
  }
}

/* ─────────── Review Creation ─────────── */
export async function addReview(
  bookId: string,
  userId: string,
  userName: string,
  rating: number,
  text: string
) {
  const db = getDbOrThrow();
  try {
    const reviewRef = collection(db, `books/${bookId}/reviews`);
    await addDoc(reviewRef, {
      userId,
      userName,
      rating,
      text,
      createdAt: serverTimestamp(),
    });
    await incrementField(`books/${bookId}`, 'reviewsCount', 1);
    await updateTrendingScore(bookId);
  } catch (err) {
    console.error('addReview failed:', err);
  }
}
