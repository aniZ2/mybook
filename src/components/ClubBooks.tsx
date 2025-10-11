'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2 } from 'lucide-react';
import styles from './Club.module.css';

interface Book {
  id: string;
  bookId: string;     // Firestore slug or document ID of main book
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  addedAt: any;
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
    try {
      const response = await fetch(`/api/clubs/${clubSlug}/books`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
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

  if (books.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BookOpen size={48} />
        <p>No books added yet</p>
        <span>Admins can add books to start discussions</span>
      </div>
    );
  }

  return (
    <div className={styles.booksGrid}>
      <h2 className={styles.sectionTitle}>
        <BookOpen size={20} />
        Club Books ({books.length})
      </h2>

      <div className={styles.booksList}>
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.bookId}`}  // ✅ Link to main book page
            className={styles.bookCard}
          >
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className={styles.bookCover}
              />
            ) : (
              <div className={styles.noCover}>No Cover</div>
            )}
            <div className={styles.bookInfo}>
              <h3 className={styles.bookTitle}>{book.title}</h3>
              <p className={styles.bookAuthor}>{book.author}</p>
              {book.isbn && (
                <p className={styles.bookIsbn}>ISBN: {book.isbn}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
