'use client';

import React, { useEffect, useState } from 'react';
import {
  Heart,
  Users,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Loader2,
  Plus,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import AddBookPanel from './AddBookPanel';
import styles from './Club.module.css';

interface Club {
  slug: string;
  name: string;
  description?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
  iconUrl?: string;
  bannerUrl?: string;
  memberIds?: string[];
  ownerUid?: string;
  createdAt?: string;
}

interface ClubHeaderProps {
  club: Club;
  currentUserId?: string;
  onJoinSuccess?: (newMemberCount: number) => void;
  onBookAdded?: () => void;
}

export default function ClubHeader({
  club,
  currentUserId,
  onJoinSuccess,
  onBookAdded
}: ClubHeaderProps) {
  const [isMember, setIsMember] = useState(
    club.memberIds?.includes(currentUserId || '') ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(club.membersCount || 0);
  const [showAddBookPanel, setShowAddBookPanel] = useState(false);
  const [clubBooks, setClubBooks] = useState<any[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const isAdmin = club.ownerUid === currentUserId;

  // ─────────────── Helpers ───────────────
  const formatCount = (count: number) =>
    count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count.toString();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // ─────────────── Fetch Club Books ───────────────
  const fetchBooks = async () => {
    try {
      const db = getDbOrThrow();
      const booksRef = collection(db, 'clubs', club.slug, 'books');
      const snap = await getDocs(booksRef);
      const books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClubBooks(books);
    } catch (err) {
      console.error('Error fetching club books:', err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [club.slug]);

  // ─────────────── Join / Leave Logic ───────────────
  const handleJoinClub = async () => {
    if (!currentUserId) {
      alert('Please log in to join this club');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      const data = await response.json();

      if (response.ok) {
        setIsMember(true);
        const newCount = memberCount + 1;
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
      } else {
        alert(data.error || 'Failed to join club');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      alert('An error occurred while joining the club');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!currentUserId) return;

    const confirmed = confirm('Are you sure you want to leave this club?');
    if (!confirmed) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      const data = await response.json();

      if (response.ok) {
        setIsMember(false);
        const newCount = Math.max(0, memberCount - 1);
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
      } else {
        alert(data.error || 'Failed to leave club');
      }
    } catch (error) {
      console.error('Error leaving club:', error);
      alert('An error occurred while leaving the club');
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────── Handle Book Added ───────────────
  const handleBookAdded = async () => {
    await fetchBooks();
    onBookAdded?.();
  };

  // ─────────────── Render ───────────────
  return (
    <>
      <div className={styles.literaryLoungeHeader}>
        {/* Ambient Background */}
        <div className={styles.ambientBackground}>
          <div className={`${styles.blurOrb} ${styles.orb1}`} />
          <div className={`${styles.blurOrb} ${styles.orb2}`} />
          <div className={`${styles.blurOrb} ${styles.orb3}`} />
        </div>

        {/* Frosted Header */}
        <div className={styles.frostedContainer}>
          <div className={styles.headerContent}>
            {/* Club Identity Section */}
            <div className={styles.clubIdentity}>
              <div className={styles.clubIconWrapper}>
                {club.iconUrl ? (
                  <img
                    src={club.iconUrl}
                    alt={club.name}
                    className={styles.clubIconImg}
                  />
                ) : (
                  <div className={styles.clubIconDefault}>
                    <Heart className={styles.iconHeart} />
                  </div>
                )}
              </div>

              <div className={styles.clubInfo}>
                <h1 className={styles.clubName}>{club.name}</h1>

                {/* Description with Show More */}
                {club.description && (
                  <div className={styles.clubTaglineWrapper}>
                    <p
                      className={`${styles.clubTagline} ${
                        showFullDesc ? styles.expanded : ''
                      }`}
                    >
                      {club.description}
                    </p>
                    {club.description.length > 80 && (
                      <button
                        className={styles.toggleDescBtn}
                        onClick={() => setShowFullDesc((prev) => !prev)}
                      >
                        {showFullDesc ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                {/* Meta Section */}
                <div className={styles.clubMeta}>
                  <span className={styles.metaItem}>
                    <Users className={styles.metaIcon} />
                    {formatCount(memberCount)} members
                  </span>
                  <span className={styles.metaDivider}>•</span>
                  <span className={styles.metaItem}>
                    <BookOpen className={styles.metaIcon} />
                    {formatCount(club.booksCount || 0)} books
                  </span>
                  <span className={styles.metaDivider}>•</span>
                  <span className={styles.metaItem}>
                    <Calendar className={styles.metaIcon} />
                    {formatDate(club.createdAt)}
                  </span>
                  {club.category && (
                    <>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.metaBadge}>
                        <Sparkles className={styles.metaIcon} />
                        {club.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Club Actions */}
            <div className={styles.clubActions}>
              {isAdmin && (
                <button
                  className={styles.addBookButton}
                  onClick={() => setShowAddBookPanel(true)}
                >
                  <Plus size={18} />
                  Add Book
                </button>
              )}

              {isMember ? (
                <div
                  className={styles.memberBadge}
                  onClick={handleLeaveClub}
                  style={{ cursor: 'pointer' }}
                >
                  <CheckCircle2 className={styles.memberIcon} />
                  {isLoading ? 'Loading...' : 'Member'}
                </div>
              ) : (
                <button
                  className={styles.joinButton}
                  onClick={handleJoinClub}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        className={styles.joinIcon}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Heart className={styles.joinIcon} />
                      Join Club
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ─────────────── Club Books Section ─────────────── */}
          {clubBooks.length > 0 && (
            <div className={styles.clubBooksSection}>
              <h4 className={styles.booksTitle}>Club Library</h4>
              <div className={styles.bookCoversRow}>
                {clubBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={`/book/${book.slug}`}
                    className={styles.bookCoverLink}
                  >
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className={styles.bookCoverThumb}
                        title={`${book.title} by ${book.author}`}
                      />
                    ) : (
                      <div className={styles.noCoverThumb}>
                        <BookOpen size={22} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────── Add Book Panel ─────────────── */}
      {showAddBookPanel && (
        <AddBookPanel
          clubSlug={club.slug}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onBookAdded={handleBookAdded}
          onClose={() => setShowAddBookPanel(false)}
        />
      )}
    </>
  );
}
