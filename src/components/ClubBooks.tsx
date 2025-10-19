'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import {
  BookOpen,
  Loader2,
  Library,
  Sparkles,
  Heart,
  Crown,
  X,
} from 'lucide-react';
import styles from './Club.module.css';

interface Book {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string | null;
  description?: string | null;
  status?: 'nominated' | 'current' | 'past' | 'removed';
  isCurrentlyReading?: boolean;
  isCandidate?: boolean;
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
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [votedBookSlug, setVotedBookSlug] = useState<string | null>(null);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [removingBook, setRemovingBook] = useState<string | null>(null);

  /* ─────────────── Fetch Books ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/clubs/${clubSlug}/books`);
        const data = await res.json();

        console.log('📚 Fetched books data:', data);

        // ✅ Merge and normalize statuses
        const merged: Book[] = [
          ...(data.books || []),
          ...(data.candidates || []).map((b: any) => ({
            ...b,
            status: b.status || 'nominated',
          })),
        ];

        const unique = Object.values(
          merged.reduce((acc, b) => {
            acc[b.slug] = b; // dedupe by slug
            return acc;
          }, {} as Record<string, Book>)
        );

        console.log('📚 Processed books:', unique);
        setBooks(unique);
      } catch (err) {
        console.error('❌ Error fetching books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [clubSlug]);

  /* ─────────────── Check User's Vote ─────────────── */
  useEffect(() => {
    if (!clubSlug || !user) return;

    const checkUserVote = async () => {
      try {
        const userVoteRef = collection(db, 'clubs', clubSlug, 'userVotes');
        const snapshot = await getDocs(userVoteRef);
        
        const userVoteDoc = snapshot.docs.find(doc => doc.id === user.uid);
        
        if (userVoteDoc) {
          const bookSlug = userVoteDoc.data().bookSlug;
          setVotedBookSlug(bookSlug);
          console.log('✅ User has voted for:', bookSlug);
        } else {
          console.log('ℹ️ User has not voted yet');
          setVotedBookSlug(null);
        }
      } catch (error) {
        console.error('❌ Error checking user vote:', error);
      }
    };

    checkUserVote();
  }, [clubSlug, user, db]);

  /* ─────────────── Real-time Votes ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    
    console.log('👂 Setting up vote listener for club:', clubSlug);
    
    const votesRef = collection(db, 'clubs', clubSlug, 'votes');
    const unsub = onSnapshot(
      votesRef,
      (snap) => {
        console.log('📊 Vote snapshot received. Docs:', snap.size);
        const counts: Record<string, number> = {};
        
        snap.docs.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Vote doc:', doc.id, data);
          
          // Use doc.id as bookSlug (the document ID IS the bookSlug)
          counts[doc.id] = data.voteCount || 0;
        });
        
        console.log('📊 Final vote counts:', counts);
        setVoteCounts(counts);
      },
      (error) => {
        console.error('❌ Error in vote listener:', error);
      }
    );
    
    return () => {
      console.log('👋 Cleaning up vote listener');
      unsub();
    };
  }, [clubSlug, db]);

  /* ─────────────── Categorize Books ─────────────── */
  const currentBook = books.find((b) => b.status === 'current' || b.isCurrentlyReading);
  const pastBooks = books.filter((b) => b.status === 'past');
  const nominatedBooks = books.filter(
    (b) => (b.status === 'nominated' || b.isCandidate) && b.status !== 'removed'
  );

  /* ─────────────── Calculate Highest Vote Count ─────────────── */
  const highestVoteCount = Math.max(
    ...nominatedBooks.map(book => voteCounts[book.slug] || 0),
    0
  );

  console.log('📖 Current book:', currentBook);
  console.log('🗳️ Nominated books:', nominatedBooks);
  console.log('📚 Past books:', pastBooks);
  console.log('🏆 Highest vote count:', highestVoteCount);

  /* ─────────────── Handle Vote ─────────────── */
  const handleVote = async (bookSlug: string) => {
    if (!user) {
      alert('Please sign in to vote.');
      return;
    }

    console.log('🗳️ Voting for:', bookSlug);
    setVotingFor(bookSlug);
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/clubs/${clubSlug}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ bookSlug }),
      });

      const data = await response.json();
      console.log('🗳️ Vote response:', data);

      if (response.ok) {
        setVotedBookSlug(bookSlug);
        
        // ✅ Force refresh vote counts immediately
        const votesSnapshot = await getDocs(collection(db, 'clubs', clubSlug, 'votes'));
        const counts: Record<string, number> = {};
        votesSnapshot.docs.forEach((doc) => {
          counts[doc.id] = doc.data().voteCount || 0;
        });
        setVoteCounts(counts);
        console.log('✅ Refreshed vote counts:', counts);
        
        alert(data.message || 'Vote recorded!');
      } else {
        alert(data.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('❌ Error voting:', error);
      alert('Failed to vote');
    } finally {
      setVotingFor(null);
    }
  };

  /* ─────────────── Remove Nomination (Admin) ─────────────── */
  const handleRemoveNomination = async (book: Book) => {
    if (!isAdmin || !user) return;
    
    if (!confirm(`Remove "${book.title}" from nominations?`)) return;

    console.log('🗑️ Removing nomination:', book.slug);

    setRemovingBook(book.slug);
    try {
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${clubSlug}/books?bookSlug=${book.slug}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      
      console.log('🗑️ Remove nomination response:', data);

      if (res.ok) {
        alert(`Removed "${book.title}" from nominations`);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to remove nomination');
      }
    } catch (error) {
      console.error('❌ Error removing nomination:', error);
      alert('Failed to remove nomination');
    } finally {
      setRemovingBook(null);
    }
  };

  /* ─────────────── Declare Winner (Admin) ─────────────── */
  const handleDeclareWinner = async (book: Book) => {
    if (!isAdmin || !user) return;
    
    if (!confirm(`Declare "${book.title}" as the next read?`)) return;

    console.log('🏆 Declaring winner:', book);

    try {
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${clubSlug}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookSlugOverride: book.slug,
          title: book.title,
          author: book.authorName,
          coverUrl: book.coverUrl || null,
          description: book.description || null,
          setAsCurrentlyReading: true,
        }),
      });

      const data = await res.json();
      
      console.log('🏆 Declare winner response:', data);

      if (res.ok) {
        alert(`📚 "${book.title}" is now the next read!`);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to declare winner');
      }
    } catch (error) {
      console.error('❌ Error declaring winner:', error);
      alert('Failed to declare winner');
    }
  };

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

      {/* NOMINATED / NEXT READ VOTING */}
      <div className={styles.nextReadSection}>
        <h2 className={styles.sectionTitle}>
          <Library size={20} /> Vote for the Next Read
        </h2>

        {nominatedBooks.length === 0 ? (
          <p className={styles.emptyVoteNote}>No books nominated yet.</p>
        ) : (
          <div className={styles.booksList}>
            {nominatedBooks.map((book) => {
              const isVoted = votedBookSlug === book.slug;
              const voteCount = voteCounts[book.slug] || 0;
              const isVoting = votingFor === book.slug;
              const isRemoving = removingBook === book.slug;
              const hasHighestVotes = voteCount === highestVoteCount && highestVoteCount > 0;

              return (
                <div key={book.slug} className={styles.bookCard}>
                  {/* ✅ Remove button for admins */}
                  {isAdmin && (
                    <button
                      className={styles.removeNominationButton}
                      onClick={() => handleRemoveNomination(book)}
                      disabled={isRemoving}
                      title="Remove from nominations"
                    >
                      {isRemoving ? (
                        <Loader2 size={16} className={styles.spinner} />
                      ) : (
                        <X size={16} />
                      )}
                    </button>
                  )}

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

                  <div className={styles.bookInfo}>
                    <h3>{book.title}</h3>
                    <p>by {book.authorName}</p>
                  </div>

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

                  {/* ✅ Only show Declare Winner button if book has highest votes */}
                  {isAdmin && hasHighestVotes && (
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
          {pastBooks.length === 0 ? (
            <p className={styles.emptyVoteNote}>No past reads yet.</p>
          ) : (
            pastBooks.map((book) => (
              <div key={book.slug} className={styles.bookCard}>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}