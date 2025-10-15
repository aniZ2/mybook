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
  const [showFullDesc, setShowFullDesc] = useState(false);

  const isAdmin = club.ownerUid === currentUserId;

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
      } else alert(data.error || 'Failed to join club');
    } catch (err) {
      console.error(err);
      alert('Error joining club');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!currentUserId) return;
    if (!confirm('Are you sure you want to leave this club?')) return;

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
      } else alert(data.error || 'Failed to leave club');
    } catch (err) {
      console.error(err);
      alert('Error leaving club');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={styles.clubHeaderCompact}>
        <div className={styles.clubTopRow}>
          <img
            src={club.iconUrl || '/placeholder.jpg'}
            alt={club.name}
            className={styles.clubIconCompact}
          />

          <div className={styles.clubInfoCompact}>
            <h1 className={styles.clubNameCompact}>{club.name}</h1>

            {club.description && (
              <p
                className={`${styles.clubDescCompact} ${
                  showFullDesc ? styles.expanded : ''
                }`}
              >
                {club.description}
              </p>
            )}
            {club.description && club.description.length > 90 && (
              <button
                className={styles.toggleDescCompact}
                onClick={() => setShowFullDesc((p) => !p)}
              >
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}

            <div className={styles.clubMetaCompact}>
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
              {club.category && (
                <>
                  <span>•</span>
                  <span>
                    <Sparkles size={14} /> {club.category}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.clubActionsCompact}>
          {isAdmin && (
            <button
              className={styles.addBookButtonCompact}
              onClick={() => setShowAddBookPanel(true)}
            >
              <Plus size={16} /> Add Book
            </button>
          )}

          {isMember ? (
            <button
              className={styles.memberButtonCompact}
              onClick={handleLeaveClub}
              disabled={isLoading}
            >
              <CheckCircle2 size={16} />
              {isLoading ? 'Leaving...' : 'Member'}
            </button>
          ) : (
            <button
              className={styles.joinButtonCompact}
              onClick={handleJoinClub}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className={styles.spin} /> Joining...
                </>
              ) : (
                <>
                  <Heart size={16} /> Join Club
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showAddBookPanel && (
        <AddBookPanel
          clubSlug={club.slug}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onBookAdded={onBookAdded}
          onClose={() => setShowAddBookPanel(false)}
        />
      )}
    </>
  );
}
