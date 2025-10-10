'use client';

import React from 'react';
import styles from './Club.module.css';
import { Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';

export default function ClubSidebar({ club }: { club: any }) {
  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.sidebarTitle}>About This Club</h3>
      
      <div className={styles.sidebarSection}>
        <p className={styles.sidebarDescription}>
          {club.description || 'A welcoming space for book lovers to connect and share their passion for reading.'}
        </p>
      </div>

      <div className={styles.sidebarSection}>
        <h4 className={styles.sidebarSubtitle}>Club Stats</h4>
        <ul className={styles.sidebarList}>
          <li>
            <Users size={16} />
            <span>{club.membersCount ?? 0} members</span>
          </li>
          <li>
            <BookOpen size={16} />
            <span>{club.booksCount ?? 0} books discussed</span>
          </li>
          <li>
            <Calendar size={16} />
            <span>Created {new Date(club.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </li>
          <li>
            <TrendingUp size={16} />
            <span>Active community</span>
          </li>
        </ul>
      </div>

      <div className={styles.sidebarSection}>
        <h4 className={styles.sidebarSubtitle}>Category</h4>
        <span className={styles.categoryBadge}>
          {club.category || 'General'}
        </span>
      </div>
    </aside>
  );
}