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
import { getDbOrThrow } from '@/lib/firebase'; // ✅ use safe getter
import { useAuth } from '@/context/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import AddReview from './AddReview';
import ReviewsList from './ReviewsList';
import type { BookDoc, ReviewDoc, ClubDoc } from '@/types/firestore';
import { slugify } from '@/lib/slug';

export default function BookDetailsClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [book, setBook] = useState<BookDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [relatedBooks, setRelatedBooks] = useState<BookDoc[]>([]);
  const [clubsWithBook, setClubsWithBook] = useState<ClubDoc[]>([]);
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  /* ─────────── Load Book Data ─────────── */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      const db = getDbOrThrow(); // ✅ guarantee Firestore is initialized

      try {
        const snap = await getDoc(doc(db, 'books', slug));
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const bookData = snap.data() as BookDoc;
        bookData.id = bookData.id || slug;
        bookData.slug = bookData.slug || slug;

        if (!bookData.authorId && bookData.authorName)
          bookData.authorId = slugify(bookData.authorName);

        setBook(bookData);

        /* ─── Reviews ─── */
        const reviewsRef = collection(db, 'books', slug, 'reviews');
        const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviews = reviewsSnap.docs.map((d) => d.data() as ReviewDoc);

        if (reviews.length > 0) {
          const avg =
            reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
          setAverageRating(avg);
          setTotalReviews(reviews.length);
        }

        /* ─── Related Books ─── */
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

        /* ─── Clubs Featuring This Book ─── */
        const clubsQuery = query(collection(db, 'clubs'), limit(10));
        const clubsSnap = await getDocs(clubsQuery);
        const clubsWithThisBook: ClubDoc[] = [];

        for (const clubDoc of clubsSnap.docs) {
          const clubBooksRef = collection(db, 'clubs', clubDoc.id, 'books');
          const bookQuery = query(clubBooksRef, where('id', '==', bookData.id), limit(1));
          const bookSnap = await getDocs(bookQuery);
          if (!bookSnap.empty) clubsWithThisBook.push(clubDoc.data() as ClubDoc);
        }
        setClubsWithBook(clubsWithThisBook.slice(0, 3));

        /* ─── Reading List Check ─── */
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

  /* ─────────── Toggle Reading List ─────────── */
  const handleAddToReadingList = async () => {
    const db = getDbOrThrow(); // ✅ again
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
      alert('Failed to update reading list');
    }
  };

  /* ─────────── Share Buttons ─────────── */
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

  /* ─────────── Buy Links ─────────── */
  const amazonUrl =
    book?.asin
      ? `https://www.amazon.com/dp/${book.asin}`
      : book?.meta?.isbn13 || book?.meta?.isbn10
      ? `https://www.amazon.com/s?k=${encodeURIComponent(
          book.meta?.isbn13 || book.meta?.isbn10!
        )}`
      : book?.buyLink || null;

  const bnUrl =
    book?.meta?.isbn13 || book?.meta?.isbn10
      ? `https://www.barnesandnoble.com/s/${encodeURIComponent(
          book.meta?.isbn13 || book.meta?.isbn10!
        )}`
      : book?.bnLink || null;

  const googleUrl =
    book?.googleLink ||
    (book?.title
      ? `https://books.google.com?q=${encodeURIComponent(book.title)}`
      : null);

  /* ─────────── UI ─────────── */
  if (loading)
    return (
      <main className="container py-8 max-w-5xl mx-auto text-center text-gray-400">
        <p>Loading book details...</p>
      </main>
    );

  if (notFound || !book)
    return (
      <main className="container py-8 max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-semibold mb-2">Book Not Found</h1>
        <p className="text-gray-400 mb-4">
          We couldn't locate this title. Try searching again.
        </p>
        <Link href="/discover" className="text-yellow-500 hover:underline">
          ← Back to Discover
        </Link>
      </main>
    );

  return (
    <main className="container py-8 max-w-5xl mx-auto text-gray-100">
      <Link
        href="/discover"
        className="inline-block mb-6 text-yellow-500 hover:text-yellow-400 font-medium"
      >
        ← Back to Discover
      </Link>

      {/* ─────────── Book Panel ─────────── */}
      <section className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover */}
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              width={160}
              height={240}
              className="rounded-lg object-contain shadow-md bg-slate-800"
            />
          ) : (
            <div className="w-40 h-60 bg-slate-700 rounded flex items-center justify-center text-xs font-medium text-gray-300">
              No Cover
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-yellow-400">{book.title}</h1>
            <p className="text-gray-400 mt-1">
              by {book.authors?.join(', ') || book.authorName}
            </p>

            {averageRating !== null && (
              <div className="mt-3 text-sm text-yellow-400">
                ⭐ {averageRating.toFixed(1)} / 5 ({totalReviews} reviews)
              </div>
            )}

            <div className="mt-3 text-sm text-gray-400 space-y-1">
              {book.publisher && <p>Publisher: {book.publisher}</p>}
              {book.publishedDate && <p>Published: {book.publishedDate}</p>}
              {book.meta?.isbn13 && <p>ISBN-13: {book.meta.isbn13}</p>}
              {book.meta?.isbn10 && <p>ISBN-10: {book.meta.isbn10}</p>}
              {book.asin && <p>ASIN: {book.asin}</p>}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {amazonUrl && (
                <a
                  href={amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
                >
                  🛒 Amazon
                </a>
              )}
              {bnUrl && (
                <a
                  href={bnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  📗 Barnes & Noble
                </a>
              )}
              {googleUrl && (
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  📘 Google Books
                </a>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              {user && (
                <button
                  onClick={handleAddToReadingList}
                  className={`px-4 py-2 rounded-lg border ${
                    isInReadingList
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'border-gray-600 hover:bg-slate-800'
                  }`}
                >
                  {isInReadingList ? '✓ In Reading List' : '+ Add to Reading List'}
                </button>
              )}
              <button
                onClick={handleShare}
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-slate-800"
              >
                Share
              </button>
            </div>

            {book.description && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2 text-yellow-400">
                  About this Book
                </h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {book.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────── Related Books, Clubs, Reviews, Share Modal (unchanged) ─────────── */}
      {/* (keep your existing JSX for those sections exactly as-is) */}
    </main>
  );
}
