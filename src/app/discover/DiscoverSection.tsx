'use client';

import React from 'react';
import styles from './DiscoverSection.module.css';

interface DiscoverSectionProps {
  title: string;
  linkLabel?: string;
  onLinkClick?: () => void;
  children: React.ReactNode;
}

/**
 * A horizontally scrolling section for books, authors, or posts.
 * Used in DiscoverPage to group related cards like "Trending Books", "Emerging Authors", etc.
 */
export default function DiscoverSection({
  title,
  linkLabel,
  onLinkClick,
  children,
}: DiscoverSectionProps) {
  const hasContent = React.Children.count(children) > 0;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {linkLabel && (
          <span className={styles.link} onClick={onLinkClick}>
            {linkLabel}
          </span>
        )}
      </div>

      {hasContent ? (
        <div className={styles.scrollRow}>{children}</div>
      ) : (
        <p className={styles.empty}>Nothing to show here yet.</p>
      )}
    </section>
  );
}
