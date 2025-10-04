'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import Link from 'next/link';
import AddReview from './AddReview';
import ReviewsList from './ReviewsList';
import type { BookDoc, ReviewDoc, ClubDoc } from '@/types/firestore';

export default function BookDetailsClient({ slug }: { slug: string }) {
  const [user] = useAuthState(auth);
  const [book, setBook] = useState<BookDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [relatedBooks, setRelatedBooks] = useState<BookDoc[]>([]);
  const [clubsWithBook, setClubsWithBook] = useState<ClubDoc[]>([]);
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'books', slug));
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const bookData = snap.data() as BookDoc;
        setBook(bookData);

        // Reviews → average rating
        const reviewsRef = collection(db, 'books', slug, 'reviews');
        const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviews = reviewsSnap.docs.map((d) => d.data() as ReviewDoc);

        if (reviews.length > 0) {
          const avg =
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          setAverageRating(avg);
          setTotalReviews(reviews.length);
        }

        // Related books by same author
        if (bookData.authorId) {
          const relatedQuery = query(
            collection(db, 'books'),
            where('authorId', '==', bookData.authorId),
            limit(5)
          );
          const relatedSnap = await getDocs(relatedQuery);
          const related = relatedSnap.docs
            .map((d) => d.data() as BookDoc)
            .filter((b) => b.slug !== slug);
          setRelatedBooks(related.slice(0, 4));
        }

        // Clubs containing this book
        const clubsQuery = query(collection(db, 'clubs'), limit(10));
        const clubsSnap = await getDocs(clubsQuery);
        const clubsWithThisBook: ClubDoc[] = [];

        for (const clubDoc of clubsSnap.docs) {
          const clubBooksRef = collection(db, 'clubs', clubDoc.id, 'books');
          const bookQuery = query(
            clubBooksRef,
            where('id', '==', bookData.id),
            limit(1)
          );
          const bookSnap = await getDocs(bookQuery);
          if (!bookSnap.empty) {
            clubsWithThisBook.push(clubDoc.data() as ClubDoc);
          }
        }
        setClubsWithBook(clubsWithThisBook.slice(0, 3));

        // Reading list check
        if (user) {
          const readingListRef = doc(db, 'users', user.uid, 'readingList', slug);
          const readingListSnap = await getDoc(readingListRef);
          setIsInReadingList(readingListSnap.exists());
        }
      } catch (err) {
        console.error('Failed to fetch book:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, user]);

  // Toggle reading list
  const handleAddToReadingList = async () => {
    if (!user || !book) return;
    try {
      const readingListRef = doc(db, 'users', user.uid, 'readingList', slug);
      if (isInReadingList) {
        await deleteDoc(readingListRef);
        setIsInReadingList(false);
      } else {
        await setDoc(readingListRef, {
          bookId: book.id,
          bookSlug: slug,
          title: book.title,
          coverUrl: book.coverUrl,
          addedAt: serverTimestamp(),
        });
        setIsInReadingList(true);
      }
    } catch (err) {
      console.error('Failed to update reading list:', err);
    }
  };

  // Share buttons
  const handleShare = () => {
    if (navigator.share && book) {
      navigator.share({
        title: book.title,
        text: `Check out "${book.title}" by ${book.authorName}`,
        url: window.location.href,
      });
    } else {
      setShowShareModal(true);
    }
  };
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied!');
    setShowShareModal(false);
  };

  // Loading state
  if (loading) {
    return (
      <main className="container py-8 max-w-5xl mx-auto">
        <div className="panel p-6 animate-pulse">
          <div className="flex gap-6">
            <div className="w-40 h-60 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !book) {
    return (
      <main className="container py-8 max-w-3xl mx-auto">
        <div className="panel text-center py-12">
          <h1 className="h1">Book Not Found</h1>
          <p className="muted mt-2">We couldn’t locate this title.</p>
          <Link href="/books" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Books
          </Link>
        </div>
      </main>
    );
  }

  // Affiliate links
  const isbn = book.meta?.isbn10 || book.meta?.isbn13;
  const amazonLink = isbn ? `https://www.amazon.com/s?k=${isbn}&tag=booklyverse-20` : null;
  const googleBooksLink = isbn ? `https://books.google.com/books?vid=ISBN${isbn}` : null;

  return (
    <main className="container py-8 max-w-5xl mx-auto">
      {/* Book details */}
      <section className="panel p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover */}
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              width={160}
              height={240}
              className="rounded-lg object-contain shadow-md bg-gray-100"
              priority
            />
          ) : (
            <div className="w-40 h-60 bg-gray-300 rounded flex items-center justify-center text-xs font-medium">
              {book.title}
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="h1">{book.title}</h1>
            <div className="mt-2">
              {book.authorId ? (
                <Link href={`/authors/${book.authorId}`} className="text-lg text-blue-600 hover:underline">
                  {book.authors?.length ? book.authors.join(', ') : book.authorName}
                </Link>
              ) : (
                <p className="text-lg muted">{book.authors?.length ? book.authors.join(', ') : book.authorName}</p>
              )}
            </div>

            {/* Rating */}
            {averageRating !== null && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292..." />
                    </svg>
                  ))}
                </div>
                <span className="text-sm muted">
                  {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Metadata */}
            <div className="mt-4 text-sm muted">
              {book.meta?.isbn13 && <p>ISBN-13: {book.meta.isbn13}</p>}
              {book.meta?.isbn10 && <p>ISBN-10: {book.meta.isbn10}</p>}
              {book.publishedAt && <p>Published: {new Date(book.publishedAt.toString()).toLocaleDateString()}</p>}
            </div>

            {/* Tags */}
            {book.tags?.length ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {book.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Description */}
            {book.description && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2">About this book</h3>
                <p className="leading-relaxed whitespace-pre-line text-gray-700">{book.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6">
              {googleBooksLink && (
                <a href={googleBooksLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                  Preview
                </a>
              )}
              {amazonLink && (
                <a href={amazonLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Buy on Amazon
                </a>
              )}
              {user && (
                <button
                  onClick={handleAddToReadingList}
                  className={`px-4 py-2 rounded-lg ${isInReadingList ? 'bg-green-100 text-green-700' : 'border border-gray-300'}`}
                >
                  {isInReadingList ? '✓ In Reading List' : '+ Add to Reading List'}
                </button>
              )}
              <button onClick={handleShare} className="px-4 py-2 border border-gray-300 rounded-lg">
                Share
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Clubs, Related Books, Reviews (unchanged) */}
      {/* ... same as your snippet ... */}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowShareModal(false)}>
          <div className="panel p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Share this book</h3>
            <button onClick={copyLink} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg">Copy Link</button>
            <button onClick={() => setShowShareModal(false)} className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}
