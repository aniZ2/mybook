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
import { getDbOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import AddReview from './AddReview';
import ReviewsList from './ReviewsList';
import type { BookDoc, ReviewDoc, ClubDoc } from '@/types/firestore';
import { slugify } from '@/lib/slug';
import { useSearchParams } from 'next/navigation';
import { Users, MessageCircle, BookOpen, ArrowLeft, ChevronUp } from 'lucide-react';

export default function BookDetailsClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fromClub = searchParams.get('club');

  const [book, setBook] = useState<BookDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [relatedBooks, setRelatedBooks] = useState<BookDoc[]>([]);
  const [clubsWithBook, setClubsWithBook] = useState<ClubDoc[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  /* ─────────── Load Book Data ─────────── */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      const db = getDbOrThrow();

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

        // Reviews
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

        // Related Books
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

        // Reading List Check
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

  /* ─────────── Fetch Clubs Reading This Book ─────────── */
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/books/${slug}/clubs`);
        if (res.ok) {
          const data = await res.json();
          setClubsWithBook(data.clubs || []);
        }
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    })();
  }, [slug]);

  /* ─────────── Fetch Public Discussions ─────────── */
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/books/${slug}/discussions`);
        if (res.ok) {
          const data = await res.json();
          setDiscussions(data.discussions || []);
        }
      } catch (error) {
        console.error('Error fetching discussions:', error);
      }
    })();
  }, [slug]);

  /* ─────────── Toggle Reading List ─────────── */
  const handleAddToReadingList = async () => {
    const db = getDbOrThrow();
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

  /* ─────────── Buy Links (Safe Version) ─────────── */
  const amazonUrl = (() => {
    if (book?.asin) return `https://www.amazon.com/dp/${book.asin}`;
    const isbn = book?.meta?.isbn13 || book?.meta?.isbn10;
    if (isbn) return `https://www.amazon.com/s?k=${encodeURIComponent(isbn)}`;
    return book?.buyLink || null;
  })();

  const bnUrl = (() => {
    const isbn = book?.meta?.isbn13 || book?.meta?.isbn10;
    if (isbn) return `https://www.barnesandnoble.com/s/${encodeURIComponent(isbn)}`;
    return book?.bnLink || null;
  })();

  const googleUrl = (() => {
    if (book?.googleLink) return book.googleLink;
    if (book?.title)
      return `https://books.google.com?q=${encodeURIComponent(book.title)}`;
    return null;
  })();

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
        className="inline-flex items-center gap-2 mb-6 text-yellow-500 hover:text-yellow-400 font-medium"
      >
        <ArrowLeft size={18} /> Back to Discover
      </Link>

      {fromClub && (
        <div className="mb-6 p-3 rounded-lg bg-purple-900/30 border border-purple-700/40 text-sm text-purple-300">
          📚 Viewing this book from{' '}
          <Link
            href={`/clubs/${fromClub}`}
            className="text-yellow-400 hover:underline"
          >
            {fromClub}
          </Link>{' '}
          club.
        </div>
      )}

      {/* Book Info Panel */}
      <section className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row gap-6">
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
          </div>
        </div>
      </section>

      {/* Clubs Reading This Book */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
          <Users size={22} /> Clubs Reading This Book
        </h2>
        {clubsWithBook.length === 0 ? (
          <p className="text-gray-400">No clubs are reading this yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubsWithBook.map((club) => (
              <Link
                key={club.slug}
                href={`/clubs/${club.slug}`}
                className="bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-yellow-500/60 transition group"
              >
                <div className="flex items-start gap-3">
                  {club.iconUrl ? (
                    <img
                      src={club.iconUrl}
                      alt={club.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <BookOpen size={22} className="text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-yellow-400 transition truncate">
                      {club.name}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Users size={14} />
                      {club.membersCount || 0} members
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Public Discussions */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
          <MessageCircle size={22} /> Public Discussions
        </h2>
        {discussions.length === 0 ? (
          <p className="text-gray-400">No public discussions yet.</p>
        ) : (
          <div className="space-y-4">
            {discussions.map((d) => (
              <Link
                key={d.id}
                href={`/clubs/${d.clubSlug}/posts/${d.id}`}
                className="block bg-slate-900 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="flex items-start gap-3">
                  <ChevronUp size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-semibold text-white">{d.userName}</span>{' '}
                      • {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-gray-300 line-clamp-3">{d.content}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Reviews</h2>
        <AddReview slug={slug} />
        <ReviewsList slug={slug} />
      </section>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">
            More by {book.authorName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedBooks.map((b) => (
              <Link key={b.slug} href={`/books/${b.slug}`} className="group">
                {b.coverUrl ? (
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow-md group-hover:shadow-xl transition"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-slate-800 rounded-lg flex items-center justify-center">
                    <BookOpen size={32} className="text-gray-600" />
                  </div>
                )}
                <h3 className="mt-2 text-sm font-medium text-white group-hover:text-yellow-400 transition line-clamp-2">
                  {b.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">Share this book</h3>
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition"
            >
              Copy Link
            </button>
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-3 px-4 py-2 border border-gray-600 rounded-lg hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
