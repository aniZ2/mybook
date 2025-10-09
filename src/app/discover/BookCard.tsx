'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className={styles.bookCard}>
      {/* ─────────────── Cover ─────────────── */}
      <Link href={`/books/${book.slug}`} className={styles.coverWrapper}>
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={book.title}
            width={140}
            height={210}
            className={styles.bookCover}
            loading="lazy"
          />
        ) : (
          <div className={styles.noCover}>No Cover</div>
        )}
      </Link>

      {/* ─────────────── Title + Author ─────────────── */}
      <div className={styles.infoBlock}>
        <h3 className={styles.bookTitle}>{book.title}</h3>
        {book.authorName && (
          <p className={styles.bookAuthor}>by {book.authorName}</p>
        )}
      </div>

      {/* ─────────────── Buy Links ─────────────── */}
      <div className={styles.buyRow}>
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
