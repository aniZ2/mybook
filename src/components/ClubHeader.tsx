'use client';

import React from 'react';
import { Heart, Users, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import styles from './Club.module.css';

interface Club {
  name: string;
  description?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
  iconUrl?: string;
  bannerUrl?: string;
  memberIds?: string[]; // Firestore array of user IDs
}

interface ClubHeaderProps {
  club: Club;
  currentUserId?: string;
  onJoin?: () => void; // optional join callback
}

export default function ClubHeader({ club, currentUserId, onJoin }: ClubHeaderProps) {
  const formatCount = (count: number | undefined) =>
    !count ? '0' : count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count.toString();

  const isMember = club.memberIds?.includes(currentUserId || '') ?? false;

  return (
    <div className={styles.literaryLoungeHeader}>
      {/* Ambient Background */}
      <div className={styles.ambientBackground}>
        <div className={`${styles.blurOrb} ${styles.orb1}`} />
        <div className={`${styles.blurOrb} ${styles.orb2}`} />
        <div className={`${styles.blurOrb} ${styles.orb3}`} />
      </div>

      {/* Frosted Glass Container */}
      <div className={styles.frostedContainer}>
        <div className={styles.headerContent}>
          {/* Left: Club Identity */}
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
                  {formatCount(club.membersCount)} members
                </span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.metaItem}>
                  <BookOpen className={styles.metaIcon} />
                  {formatCount(club.booksCount)} books
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

          {/* Right: Actions */}
          <div className={styles.clubActions}>
            {isMember ? (
              <div className={styles.memberBadge}>
                <CheckCircle2 className={styles.memberIcon} />
                Member
              </div>
            ) : (
              <button className={styles.joinButton} onClick={onJoin}>
                <Heart className={styles.joinIcon} />
                Join Club
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
