'use client';

import Image from 'next/image';
import styles from './ClubHeader.module.css';

export interface ClubHeaderProps {
  club: {
    name: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    membersCount?: number;
    booksCount?: number;
    category?: string;
  };
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  return (
    <header className={styles.header}>
      {/* Banner */}
      <div className={styles.bannerWrapper}>
        {club.bannerUrl ? (
          <Image
            src={club.bannerUrl}
            alt={`${club.name} banner`}
            fill
            className={styles.bannerImage}
          />
        ) : (
          <div className={styles.bannerFallback} />
        )}
      </div>

      {/* Club info */}
      <div className={styles.info}>
        <div className={styles.iconWrapper}>
          <Image
            src={club.iconUrl || '/placeholder.png'}
            alt={club.name}
            width={90}
            height={90}
            className={styles.icon}
          />
        </div>

        <div className={styles.textBlock}>
          <h1 className={styles.name}>{club.name}</h1>
          {club.description && <p className={styles.description}>{club.description}</p>}
          <div className={styles.stats}>
            <span>👥 {club.membersCount ?? 0} members</span>
            <span>📚 {club.booksCount ?? 0} books</span>
            {club.category && <span>🏷️ {club.category}</span>}
          </div>
        </div>

        <button className={styles.joinButton}>Join Club</button>
      </div>
    </header>
  );
}
