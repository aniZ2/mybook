'use client';

import React from 'react';
import Link from 'next/link';
import styles from './DiscoverPage.module.css';
import type { BookDoc } from '@/types/firestore';

interface BookCardProps {
  book: BookDoc & {
    buyLink?: string | null;
    bnLink?: string | null;
    googleLink?: string | null;
  };
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <div className={styles.card}>
      {/* Cover */}
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={book.title}
          className={styles.cover}
          loading="lazy"
        />
      )}

      {/* Title */}
      <Link href={`/book/${book.slug}`} className={styles.titleLink}>
        <h3 className={styles.title}>{book.title}</h3>
      </Link>

      {/* Author */}
      {book.authorName && (
        <p className={styles.author}>by {book.authorName}</p>
      )}

      {/* Buy Links */}
      <div className={styles.buyLinks}>
        {book.buyLink && (
          <a
            href={book.buyLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyBtn}
          >
            Amazon
          </a>
        )}
        {book.bnLink && (
          <a
            href={book.bnLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyBtn}
          >
            B&N
          </a>
        )}
        {book.googleLink && (
          <a
            href={book.googleLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyBtnAlt}
          >
            Google Books
          </a>
        )}
      </div>
    </div>
  );
}
