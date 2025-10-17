'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import {
  collection,
  onSnapshot,
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
  Plus,
  Heart,
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
  const [nomTitle, setNomTitle] = useState('');
  const [nomAuthor, setNomAuthor] = useState('');
  
  // Voting state
  const [votedBookSlug, setVotedBookSlug] = useState<string | null>(null);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  /* ─────────────── Fetch Books ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs/${clubSlug}/books`);
        const data = await res.json();
        setBooks(data.books || []);
        setNextCandidates(data.candidates || []);
        setRoundActive(data.roundActive || false);
      } catch (err) {
        console.error('❌ Error fetching books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [clubSlug]);

  /* ─────────────── Fetch User's Vote ─────────────── */
  useEffect(() => {
    if (!clubSlug || !user) return;

    const fetchUserVote = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/clubs/${clubSlug}/votes/user`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVotedBookSlug(data.bookSlug || null);
        }
      } catch (error) {
        console.error('Error fetching user vote:', error);
      }
    };

    fetchUserVote();
  }, [clubSlug, user]);

  /* ─────────────── Real-time Votes ─────────────── */
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

  /* ─────────────── Handle Nominate ─────────────── */
  const handleNominate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return alert('Only admins can nominate.');
    if (!nomTitle.trim()) return alert('Please enter a title.');

    const token = await user.getIdToken();

    const res = await fetch(`/api/clubs/${clubSlug}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: nomTitle.trim(),
        author: nomAuthor.trim() || 'Unknown',
        nominateForNext: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Nomination failed.');
    } else {
      alert('✅ Book nominated successfully!');
      setNomTitle('');
      setNomAuthor('');
      // Refresh the list
      const booksRes = await fetch(`/api/clubs/${clubSlug}/books`);
      const booksData = await booksRes.json();
      setNextCandidates(booksData.candidates || []);
    }
  };

  /* ─────────────── Vote (FIXED - Use API) ─────────────── */
  const handleVote = async (bookSlug: string) => {
    if (!user) return alert('Please sign in to vote.');

    setVotingFor(bookSlug);

    try {
      // Get the ID token - THIS IS CRITICAL
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/clubs/${clubSlug}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`, // ← This ensures one vote per user
        },
        body: JSON.stringify({ bookSlug }),
      });

      const data = await response.json();

      if (response.ok) {
        const oldVote = votedBookSlug;
        
        // Update local state
        setVotedBookSlug(bookSlug);
        
        // Update vote counts optimistically
        setVoteCounts((prev) => {
          const updated = { ...prev };
          
          // Decrement old vote if exists and different
          if (oldVote && oldVote !== bookSlug) {
            updated[oldVote] = Math.max(0, (updated[oldVote] || 0) - 1);
          }
          
          // Increment new vote (only if not already voted for this book)
          if (oldVote !== bookSlug) {
            updated[bookSlug] = (updated[bookSlug] || 0) + 1;
          }
          
          return updated;
        });

        alert(data.message || 'Vote recorded!');
      } else {
        alert(data.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote');
    } finally {
      setVotingFor(null);
    }
  };

  /* ─────────────── Declare Winner ─────────────── */
  const handleDeclareWinner = async (book: Book) => {
    if (!isAdmin || !user) return;
    const token = await user.getIdToken();

    await fetch(`/api/clubs/${clubSlug}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bookSlugOverride: book.slug,
        title: book.title,
        author: book.authorName,
        setAsCurrentlyReading: true,
      }),
    });

    alert(`📚 "${book.title}" is now the next read!`);
  };

  /* ─────────────── Reset Round ─────────────── */
  const handleResetRound = async () => {
    if (!isAdmin || !user) return;
    const token = await user.getIdToken();

    await fetch(`/api/clubs/${clubSlug}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resetRound: true }),
    });

    alert('🔄 Voting round reset.');
    
    // Clear local vote state
    setVotedBookSlug(null);
  };

  /* ─────────────── UI ─────────────── */
  if (loading)
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={24} />
        <p>Loading books...</p>
      </div>
    );

  const currentBook = books.find((b) => b.isCurrentlyReading);
  const pastBooks = books.filter((b) => !b.isCurrentlyReading);

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

      {/* 🧾 NOMINATION FORM (Admins Only) */}
      {isAdmin && (
        <form onSubmit={handleNominate} className={styles.nominateForm}>
          <h3>
            <Plus size={16} /> Nominate a Book
          </h3>
          <div className={styles.nominateFields}>
            <input
              type="text"
              placeholder="Book title..."
              value={nomTitle}
              onChange={(e) => setNomTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Author (optional)"
              value={nomAuthor}
              onChange={(e) => setNomAuthor(e.target.value)}
            />
            <button type="submit">
              <Plus size={14} /> Add
            </button>
          </div>
        </form>
      )}

      {/* NEXT READ VOTING */}
      <div className={styles.nextReadSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Library size={20} /> Vote for the Next Read
          </h2>
          {isAdmin && roundActive && (
            <div className={styles.roundControls}>
              <button onClick={handleResetRound} className={styles.roundBtn}>
                <RefreshCcw size={14} /> Reset
              </button>
            </div>
          )}
        </div>

        {nextCandidates.length === 0 ? (
          <p className={styles.emptyVoteNote}>No books nominated yet.</p>
        ) : (
          <div className={styles.booksList}>
            {nextCandidates.map((book) => {
              const isVoted = votedBookSlug === book.slug;
              const voteCount = voteCounts[book.slug] || 0;
              const isVoting = votingFor === book.slug;

              return (
                <div key={book.id} className={styles.bookCard}>
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className={styles.bookCover}
                    />
                  ) : (
                    <div className={styles.noCover}>
                      <Heart size={32} />
                    </div>
                  )}

                  <button
                    className={`${styles.voteButton} ${isVoted ? styles.voted : ''}`}
                    onClick={() => handleVote(book.slug)}
                    disabled={isVoting}
                  >
                    {isVoting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Voting...
                      </>
                    ) : isVoted ? (
                      <>
                        <Heart size={16} fill="currentColor" />
                        Voted ({voteCount})
                      </>
                    ) : (
                      <>
                        <Heart size={16} />
                        Vote ({voteCount})
                      </>
                    )}
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
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}