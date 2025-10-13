'use client';

import React, { useState } from 'react';
import {
  Search,
  Book,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  X
} from 'lucide-react';
import styles from './AddBookPanel.module.css';

interface Book {
  id: string;
  slug?: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
}

interface AddBookPanelProps {
  clubSlug: string;
  currentUserId?: string;
  onBookAdded?: () => void;
  isAdmin?: boolean;
  onClose?: () => void; // ✅ allows ClubHeader to close it
}

export default function AddBookPanel({
  clubSlug,
  currentUserId,
  onBookAdded,
  isAdmin,
  onClose
}: AddBookPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─────────────── Helpers ───────────────
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ─────────────── Search Books ───────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      const books = (data.results || []).map((b: any) => ({
        id: b.id || b.isbn13 || b.isbn10 || b.title,
        slug: b.slug || b.id,
        title: b.title,
        author: Array.isArray(b.authors) ? b.authors.join(', ') : b.authors || 'Unknown Author',
        coverUrl: b.cover,
        isbn: b.isbn13 || b.isbn10,
      }));
      setSearchResults(books);
    } catch (err) {
      console.error('Search failed', err);
      showToast('error', 'Failed to search books');
    } finally {
      setSearching(false);
    }
  };

  // ─────────────── Add Book ───────────────
  const handleAddBook = async (book: Book, setAsCurrent: boolean = false) => {
    if (!isAdmin) {
      showToast('error', 'Only admins can add books');
      return;
    }
    if (!currentUserId) {
      showToast('error', 'Please sign in to add a book');
      return;
    }

    setAdding(true);
    try {
      const bookSlug =
        book.slug ||
        book.id ||
        book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { auth } = await import('@/lib/firebase');
      if (!auth) throw new Error('Firebase not initialized');

      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to perform this action.');

      const token = await user.getIdToken();

      const response = await fetch(`/api/clubs/${clubSlug}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookSlug,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          isbn: book.isbn,
          setAsCurrentlyReading: setAsCurrent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add book');
      }

      showToast(
        'success',
        setAsCurrent
          ? `✨ "${book.title}" set as currently reading`
          : `📚 "${book.title}" added to the club library`
      );

      setSearchQuery('');
      setSearchResults([]);
      onBookAdded?.();
    } catch (err) {
      console.error('Error adding book:', err);
      showToast('error', err instanceof Error ? err.message : 'Failed to add book');
    } finally {
      setAdding(false);
    }
  };

  // ─────────────── Render ───────────────
  if (!isAdmin) {
    return (
      <div className={styles.panel}>
        <div className={styles.restrictedView}>
          <Lock size={20} />
          <p>Only club admins can add or manage books.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header with close button */}
      <div className={styles.panelHeader}>
        <h3 className={styles.title}>Add a Book to Your Club</h3>
        <button className={styles.closeButton} onClick={() => onClose?.()}>
          <X size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by title, author, or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Search Results */}
      <div className={styles.resultsSection}>
        {searchResults.length === 0 && !searching && (
          <div className={styles.emptyState}>
            <Book size={40} />
            <p>Search for books to add to your club</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className={styles.bookList}>
            {searchResults.map((book) => (
              <div key={book.id} className={styles.bookItem}>
                <div className={styles.bookInfo}>
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className={styles.bookCover}
                    />
                  ) : (
                    <div className={styles.noCover}>
                      <Book size={32} />
                    </div>
                  )}
                  <div className={styles.bookDetails}>
                    <h4>{book.title}</h4>
                    <p>{book.author}</p>
                  </div>
                </div>

                <div className={styles.bookActions}>
                  <button
                    onClick={() => handleAddBook(book, true)}
                    disabled={adding}
                    className={styles.setCurrentButton}
                    title="Set as currently reading"
                  >
                    <Sparkles size={16} />
                    {adding ? 'Setting...' : 'Set as Current'}
                  </button>
                  <button
                    onClick={() => handleAddBook(book, false)}
                    disabled={adding}
                    className={styles.addButton}
                  >
                    <Plus size={16} />
                    {adding ? 'Adding...' : 'Add to Library'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
