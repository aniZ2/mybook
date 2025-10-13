'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Library, Sparkles } from 'lucide-react';
import styles from './Club.module.css';

interface Book {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string | null;
  description?: string | null;
  isCurrentlyReading?: boolean;
}

interface ClubBooksProps {
  clubSlug: string;
}

export default function ClubBooks({ clubSlug }: ClubBooksProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, [clubSlug]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      console.log('📚 Fetching books for club:', clubSlug);
      
      const res = await fetch(`/api/clubs/${clubSlug}/books`);
      
      if (!res.ok) {
        console.error('❌ Failed to fetch books:', res.status);
        return;
      }
      
      const data = await res.json();
      console.log('✅ Fetched books:', data.books);
      
      setBooks(data.books || []);
    } catch (error) {
      console.error('❌ Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={24} />
        <p>Loading books...</p>
      </div>
    );
  }

  const currentBook = books.find(b => b.isCurrentlyReading);
  const pastBooks = books.filter(b => !b.isCurrentlyReading);

  if (!currentBook && pastBooks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BookOpen size={48} />
        <p>No books added yet</p>
        <span>Admins can add books to start discussions</span>
      </div>
    );
  }

  return (
    <div className={styles.booksSection}>
      {/* Currently Reading */}
      {currentBook && (
        <div className={styles.currentlyReading}>
          <div className={styles.currentBookHeader}>
            <h2 className={styles.currentBookTitle}>
              <Sparkles size={20} />
              Currently Reading
            </h2>
          </div>
          
          <Link
            href={`/books/${currentBook.slug}?club=${clubSlug}`}
            className={styles.currentBookCard}
          >
            <div className={styles.currentBookCoverWrapper}>
              {currentBook.coverUrl ? (
                <img
                  src={currentBook.coverUrl}
                  alt={currentBook.title}
                  className={styles.currentBookCover}
                />
              ) : (
                <div className={styles.currentBookNoCover}>
                  <BookOpen size={48} />
                </div>
              )}
            </div>
            
            <div className={styles.currentBookInfo}>
              <h3 className={styles.currentBookName}>{currentBook.title}</h3>
              <p className={styles.currentBookAuthor}>by {currentBook.authorName}</p>
              {currentBook.description && (
                <p className={styles.currentBookDescription}>
                  {currentBook.description.slice(0, 150)}
                  {currentBook.description.length > 150 ? '...' : ''}
                </p>
              )}
              <div className={styles.currentBookBadge}>
                <BookOpen size={14} />
                Join the discussion
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Past Books / Library */}
      {pastBooks.length > 0 && (
        <div className={styles.pastBooksSection}>
          <h2 className={styles.sectionTitle}>
            <Library size={20} />
            Book Library ({pastBooks.length})
          </h2>

          <div className={styles.booksList}>
            {pastBooks.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.slug}?club=${clubSlug}`}
                className={styles.bookCard}
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className={styles.bookCover}
                  />
                ) : (
                  <div className={styles.noCover}>
                    <BookOpen size={24} />
                  </div>
                )}
                <div className={styles.bookInfo}>
                  <h3 className={styles.bookTitle}>{book.title}</h3>
                  <p className={styles.bookAuthor}>by {book.authorName}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}