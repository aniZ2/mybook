'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  increment,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import {
  BookOpen,
  Loader2,
  Library,
  Sparkles,
  ThumbsUp,
  Crown,
  RefreshCcw,
} from 'lucide-react';
import styles from './Club.module.css';

interface Book {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string | null;
  description?: string | null;
  isCurrentlyReading?: boolean;
}

interface ClubBooksProps {
  clubSlug: string;
  isAdmin?: boolean;
}

export default function ClubBooks({ clubSlug, isAdmin }: ClubBooksProps) {
  const { user } = useAuth();
  const db = getDbOrThrow();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCandidates, setNextCandidates] = useState<Book[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [roundActive, setRoundActive] = useState<boolean>(false);

  /* ─────────────── Fetch Books ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs/${clubSlug}/books`);
        const data = await res.json();
        setBooks(data.books || []);
      } catch (err) {
        console.error('❌ Error fetching books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [clubSlug]);

  /* ─────────────── Fetch + Auto-heal Club Meta ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const clubRef = doc(db, 'clubs', clubSlug);

    const unsub = onSnapshot(clubRef, async (snap) => {
      const club = snap.data();

      // 🧩 Auto-heal missing fields
      if (!club || club.roundActive === undefined || !Array.isArray(club.nextCandidates)) {
        console.warn(`⚙️ Auto-healing club meta for ${clubSlug}...`);
        await setDoc(
          clubRef,
          {
            roundActive: false,
            nextCandidates: [],
            trendingPool: [],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setRoundActive(false);
        setNextCandidates([]);
        return;
      }

      setRoundActive(club.roundActive ?? false);

      // 🔄 Derive candidates: prefer nextCandidates, fallback to trendingPool
      let candidates = books.filter((b) =>
        (club.nextCandidates || []).includes(b.slug)
      );

      if (candidates.length === 0 && club.trendingPool?.length > 0) {
        candidates = books.filter((b) =>
          club.trendingPool.includes(b.slug)
        );
      }

      setNextCandidates(candidates);
    });

    return () => unsub();
  }, [books, clubSlug, db]);

  /* ─────────────── Real-time Vote Counts ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const votesRef = collection(db, 'clubs', clubSlug, 'votes');
    const unsub = onSnapshot(votesRef, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        counts[d.id] = d.data().voteCount || 0;
      });
      setVoteCounts(counts);
    });
    return () => unsub();
  }, [clubSlug, db]);

  /* ─────────────── Vote ─────────────── */
  const handleVote = async (bookSlug: string) => {
    if (!user) return alert('Please sign in to vote.');
    const ref = doc(db, 'clubs', clubSlug, 'votes', bookSlug);
    await setDoc(
      ref,
      {
        voters: arrayUnion(user.uid),
        voteCount: increment(1),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
  };

  /* ─────────────── Declare Winner ─────────────── */
  const handleDeclareWinner = async (book: Book) => {
    if (!isAdmin || !user) return;
    const token = await user.getIdToken();

    await fetch(`/api/clubs/${clubSlug}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bookSlug: book.slug,
        title: book.title,
        author: book.authorName,
        setAsCurrentlyReading: true,
      }),
    });

    const votesSnap = await getDocs(collection(db, 'clubs', clubSlug, 'votes'));
    const deletions = votesSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);

    const clubRef = doc(db, 'clubs', clubSlug);
    await setDoc(
      clubRef,
      {
        nextCandidates: [],
        roundActive: false,
        roundEndedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert(`📚 "${book.title}" is now the next read! Votes cleared.`);
  };

  /* ─────────────── Start New Round ─────────────── */
  const handleStartRound = async () => {
    if (!isAdmin || !user) return;

    const clubRef = doc(db, 'clubs', clubSlug);

    // Pull top trending titles for candidates
    const trendingSnap = await getDocs(collection(db, 'books'));
    const trendingBooks: string[] = [];
    trendingSnap.docs
      .sort((a, b) => (b.data().search_score_24h || 0) - (a.data().search_score_24h || 0))
      .slice(0, 5)
      .forEach((b) => trendingBooks.push(b.id));

    await setDoc(
      clubRef,
      {
        roundActive: true,
        nextCandidates: trendingBooks,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert('🗳️ Voting round started with trending books!');
  };

  /* ─────────────── Derived Sets ─────────────── */
  const currentBook = books.find((b) => b.isCurrentlyReading);
  const pastBooks = books.filter((b) => !b.isCurrentlyReading);

  /* ─────────────── UI ─────────────── */
  if (loading)
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={24} />
        <p>Loading books...</p>
      </div>
    );

  return (
    <div className={styles.booksSection}>
      {/* CURRENTLY READING */}
      {currentBook && (
        <div className={styles.currentlyReading}>
          <h2 className={styles.currentBookTitle}>
            <Sparkles size={20} /> Currently Reading
          </h2>
          <Link
            href={`/books/${currentBook.slug}?club=${clubSlug}`}
            className={styles.currentBookCard}
          >
            <img
              src={currentBook.coverUrl || '/placeholder.jpg'}
              alt={currentBook.title}
              className={styles.currentBookCover}
            />
            <div className={styles.currentBookInfo}>
              <h3>{currentBook.title}</h3>
              <p>by {currentBook.authorName}</p>
            </div>
          </Link>
        </div>
      )}

      {/* NEXT READ VOTING */}
      {roundActive && (
        <div className={styles.nextReadSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Library size={20} /> Vote for the Next Read
            </h2>
            {isAdmin && (
              <button className={styles.roundBtn} onClick={handleStartRound}>
                <RefreshCcw size={16} /> Restart Round
              </button>
            )}
          </div>

          {nextCandidates.length === 0 && (
            <p className={styles.emptyVoteNote}>
              No candidates yet — pulling trending titles...
            </p>
          )}

          <div className={styles.booksList}>
            {nextCandidates.map((book) => (
              <div key={book.id} className={styles.bookCard}>
                <Link
                  href={`/books/${book.slug}?club=${clubSlug}`}
                  className={styles.bookLink}
                >
                  <img
                    src={book.coverUrl || '/placeholder.jpg'}
                    alt={book.title}
                    className={styles.bookCover}
                  />
                  <div className={styles.bookInfo}>
                    <h3>{book.title}</h3>
                    <p>by {book.authorName}</p>
                  </div>
                </Link>

                <div className={styles.voteControls}>
                  <button
                    className={styles.voteButton}
                    onClick={() => handleVote(book.slug)}
                  >
                    <ThumbsUp size={16} />
                    Vote ({voteCounts[book.slug] || 0})
                  </button>
                  {isAdmin && (
                    <button
                      className={styles.declareButton}
                      onClick={() => handleDeclareWinner(book)}
                    >
                      <Crown size={14} /> Declare Winner
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAST READS */}
      <div className={styles.pastBooksSection}>
        <h2 className={styles.sectionTitle}>
          <BookOpen size={20} /> Past Reads
        </h2>
        <div className={styles.booksList}>
          {pastBooks.map((book) => (
            <div key={book.id} className={styles.bookCard}>
              <Link
                href={`/books/${book.slug}?club=${clubSlug}`}
                className={styles.bookLink}
              >
                <img
                  src={book.coverUrl || '/placeholder.jpg'}
                  alt={book.title}
                  className={styles.bookCover}
                />
                <div className={styles.bookInfo}>
                  <h3>{book.title}</h3>
                  <p>by {book.authorName}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* START ROUND BUTTON */}
      {!roundActive && isAdmin && (
        <div className={styles.roundControl}>
          <button className={styles.roundBtn} onClick={handleStartRound}>
            <RefreshCcw size={16} /> Start Next Round
          </button>
        </div>
      )}
    </div>
  );
}
