'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Share2,
  ListPlus,
  BookmarkCheck,
  Star,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import AddReview from './AddReview';
import ReviewsList from './ReviewsList';
import styles from './BookDetailsClient.module.css';

export default function BookDetailsClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fromClub = searchParams.get('club');

  const [book, setBook] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [relatedBooks, setRelatedBooks] = useState<any[]>([]);
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  const handleGoBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/discover');
  };

  /* ─────────── Load Book Data ─────────── */
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const response = await fetch(`/api/books/${slug}`);
        if (!response.ok) {
          if (response.status === 404) setNotFound(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setBook(data.book);
        setRelatedBooks(data.relatedBooks || []);

        // Fetch Reviews
        const db = getDbOrThrow();
        const reviewsRef = collection(db, 'books', slug, 'reviews');
        const reviewsSnap = await getDocs(query(reviewsRef, orderBy('createdAt', 'desc')));
        const reviews = reviewsSnap.docs.map((d) => d.data() as any);

        if (reviews.length > 0) {
          const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
          setAverageRating(avg);
          setTotalReviews(reviews.length);
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

  /* ─────────── Toggle Reading List ─────────── */
  const handleAddToReadingList = async () => {
    if (!user || !book) return;
    const db = getDbOrThrow();

    try {
      const ref = doc(db, 'users', user.uid, 'readingList', slug);
      if (isInReadingList) {
        await deleteDoc(ref);
        setIsInReadingList(false);
      } else {
        await setDoc(ref, {
          bookId: book.id,
          bookSlug: slug,
          title: book.title,
          coverUrl: book.coverUrl,
          addedAt: serverTimestamp(),
        });
        setIsInReadingList(true);
      }
    } catch {
      alert('Failed to update reading list');
    }
  };

  /* ─────────── Share ─────────── */
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

  /* ─────────── Loading / Not Found ─────────── */
  if (loading)
    return (
      <main className={styles.loadingWrapper}>
        <p>Loading book details...</p>
      </main>
    );

  if (notFound || !book)
    return (
      <main className={styles.notFoundWrapper}>
        <h1>Book Not Found</h1>
        <button onClick={handleGoBack} className={styles.backBtnBottom}>
          Back
        </button>
      </main>
    );

  /* ─────────── UI ─────────── */
  return (
    <main className={styles.page}>
      {fromClub && (
        <div className={styles.fromClubBanner}>
          Viewing this book from{' '}
          <Link href={`/clubs/${fromClub}`} className={styles.fromClubLink}>
            {fromClub}
          </Link>{' '}
          club.
        </div>
      )}

      {/* HERO SECTION */}
      <section className={styles.hero}>
        {/* LEFT SIDE */}
        <div className={styles.leftPane}>
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              width={240}
              height={340}
              className={styles.cover}
            />
          ) : (
            <div className={styles.noCover}>No Cover</div>
          )}

          <div className={styles.actions}>
            {user && (
              <button
                onClick={handleAddToReadingList}
                className={isInReadingList ? styles.inListBtn : styles.addBtn}
              >
                {isInReadingList ? <BookmarkCheck size={18} /> : <ListPlus size={18} />}
                {isInReadingList ? 'In Reading List' : 'Add to Reading List'}
              </button>
            )}

            {/* Three buttons side by side */}
            <div className={styles.actionRow}>
              <button onClick={handleShare} className={styles.shareBtn}>
                <Share2 size={16} /> Share Book
              </button>
              <Link href={`/books/${slug}/clubs`} className={styles.actionLink}>
                Clubs Reading This Book
              </Link>
              <Link href={`/books/${slug}/discussions`} className={styles.actionLink}>
                Public Discussions
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className={styles.rightPane}>
          <h1 className={styles.title}>{book.title}</h1>
          <p className={styles.author}>by {book.authors?.join(', ') || book.authorName}</p>

          {averageRating !== null && (
            <div className={styles.ratingBox}>
              <Star size={22} className={styles.starIcon} />
              <span className={styles.ratingValue}>{averageRating.toFixed(1)} / 5</span>
              <span className={styles.reviewCount}>({totalReviews} reviews)</span>
            </div>
          )}

          <div className={styles.meta}>
            <h3>Book Details</h3>
            {book.publisher && (
              <p>
                Publisher: <span>{book.publisher}</span>
              </p>
            )}
            {book.publishedDate && (
              <p>
                Published: <span>{book.publishedDate}</span>
              </p>
            )}
            {book.meta?.isbn13 && (
              <p>
                ISBN-13: <span>{book.meta.isbn13}</span>
              </p>
            )}
          </div>

          <div className={styles.summary}>
            <h3>Summary</h3>
            <p>{book.description || 'No summary available.'}</p>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className={styles.reviews}>
        <h2>Reviews</h2>
        <AddReview slug={slug} />
        <ReviewsList slug={slug} />
      </section>

      {/* Bottom Back Button */}
      <div className={styles.bottomBack}>
        <button onClick={handleGoBack} className={styles.backBtnBottom}>
          Back
        </button>
      </div>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Share this book</h3>
            <button onClick={copyLink} className={styles.copyBtn}>
              Copy Link
            </button>
            <button onClick={() => setShowShareModal(false)} className={styles.closeBtn}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
