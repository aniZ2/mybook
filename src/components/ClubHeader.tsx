'use client';

import React, { useState } from 'react';
import { Heart, Users, BookOpen, Sparkles, CheckCircle2, Loader2, Plus } from 'lucide-react';
import AddBookModal from './AddBookModal';
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
}

interface ClubHeaderProps {
  club: Club;
  currentUserId?: string;
  onJoinSuccess?: (newMemberCount: number) => void;
  onBookAdded?: () => void;
}

export default function ClubHeader({ club, currentUserId, onJoinSuccess, onBookAdded }: ClubHeaderProps) {
  const [isMember, setIsMember] = useState(
    club.memberIds?.includes(currentUserId || '') ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(club.membersCount || 0);
  const [showAddBookModal, setShowAddBookModal] = useState(false);

  const isAdmin = club.ownerUid === currentUserId;

  const formatCount = (count: number) =>
    count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count.toString();

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

  return (
    <>
      <div className={styles.literaryLoungeHeader}>
        <div className={styles.ambientBackground}>
          <div className={`${styles.blurOrb} ${styles.orb1}`} />
          <div className={`${styles.blurOrb} ${styles.orb2}`} />
          <div className={`${styles.blurOrb} ${styles.orb3}`} />
        </div>

        <div className={styles.frostedContainer}>
          <div className={styles.headerContent}>
            <div className={styles.clubIdentity}>
              <div className={styles.clubIconWrapper}>
                {club.iconUrl ? (
                  <img src={club.iconUrl} alt={club.name} className={styles.clubIconImg} />
                ) : (
                  <div className={styles.clubIconDefault}>
                    <Heart className={styles.iconHeart} />
                  </div>
                )}
              </div>

              <div className={styles.clubInfo}>
                <h1 className={styles.clubName}>{club.name}</h1>
                {club.description && (
                  <p className={styles.clubTagline}>{club.description}</p>
                )}

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

            <div className={styles.clubActions}>
              {isAdmin && (
                <button 
                  className={styles.addBookButton}
                  onClick={() => setShowAddBookModal(true)}
                >
                  <Plus size={18} />
                  Add Book
                </button>
              )}

              {isMember ? (
                <div className={styles.memberBadge} onClick={handleLeaveClub} style={{ cursor: 'pointer' }}>
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
                      <Loader2 className={styles.joinIcon} style={{ animation: 'spin 1s linear infinite' }} />
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
        </div>
      </div>

      <AddBookModal
        isOpen={showAddBookModal}
        onClose={() => setShowAddBookModal(false)}
        clubSlug={club.slug}
        currentUserId={currentUserId}
        onBookAdded={onBookAdded}
      />
    </>
  );
}