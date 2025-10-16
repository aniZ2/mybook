'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Heart,
  Users,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Loader2,
  Plus,
  Calendar,
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
  onBookAdded,
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

  const formatCount = (count: number) =>
    count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count.toString();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const fetchBooks = useCallback(async () => {
    try {
      const db = getDbOrThrow();
      const booksRef = collection(db, 'clubs', club.slug, 'books');
      const snap = await getDocs(booksRef);
      const books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClubBooks(books);
    } catch (err) {
      console.error('Error fetching club books:', err);
    }
  }, [club.slug]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleJoinClub = async () => {
    if (!currentUserId) return alert('Please log in to join this club');

    setIsLoading(true);
    try {
      const res = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsMember(true);
        const newCount = memberCount + 1;
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
      } else {
        alert(data.error || 'Failed to join club');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!currentUserId) return;
    if (!confirm('Leave this club?')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsMember(false);
        const newCount = Math.max(0, memberCount - 1);
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
      } else alert(data.error || 'Failed to leave club');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAdded = async () => {
    await fetchBooks();
    onBookAdded?.();
  };

  return (
    <>
      <div className={styles.literaryLoungeHeader}>
        <div className={styles.ambientBackground}>
          <div className={`${styles.blurOrb} ${styles.orb1}`} />
          <div className={`${styles.blurOrb} ${styles.orb2}`} />
        </div>

        <div className={styles.frostedContainer}>
          <div className={styles.headerContent}>
            <div className={styles.clubIdentity}>
              {/* Club Icon */}
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

                {/* Add Book directly below icon */}
                {isAdmin && (
                  <button
                    className={styles.iconAddBookButton}
                    onClick={() => setShowAddBookPanel(true)}
                  >
                    <Plus size={14} />
                    Add Book
                  </button>
                )}
              </div>

              {/* Club Info */}
              <div className={styles.clubInfo}>
                <div className={styles.clubTitleRow}>
                  <h1 className={styles.clubName}>{club.name}</h1>

                  {/* Member badge beside title */}
                  {isMember ? (
                    <div
                      className={styles.memberBadge}
                      onClick={handleLeaveClub}
                    >
                      <CheckCircle2 className={styles.memberIcon} />
                      {isLoading ? '...' : 'Member'}
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
                          ...
                        </>
                      ) : (
                        <>
                          <Heart className={styles.joinIcon} />
                          Join
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Description */}
                {club.description && (
                  <p
                    className={`${styles.clubTagline} ${
                      showFullDesc ? styles.expanded : ''
                    }`}
                  >
                    {club.description}
                  </p>
                )}

                {/* Meta */}
                <div className={styles.clubMeta}>
                  <span>
                    <Users size={14} /> {formatCount(memberCount)} members
                  </span>
                  <span>•</span>
                  <span>
                    <BookOpen size={14} /> {formatCount(club.booksCount || 0)} books
                  </span>
                  <span>•</span>
                  <span>
                    <Calendar size={14} /> {formatDate(club.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Club Books */}
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
                      />
                    ) : (
                      <div className={styles.noCoverThumb}>
                        <BookOpen size={20} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
