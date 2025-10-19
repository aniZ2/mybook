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
  X,
} from 'lucide-react';
import styles from './AddBookPanel.module.css';

interface Book {
  id: string;
  slug?: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  status?: string;
}

interface AddBookPanelProps {
  clubSlug: string;
  currentUserId?: string;
  onBookAdded?: () => void;
  isAdmin?: boolean;
  onClose?: () => void;
}

export default function AddBookPanel({
  clubSlug,
  currentUserId,
  onBookAdded,
  isAdmin,
  onClose,
}: AddBookPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  /* ─────────────── Firestore Library Search ─────────────── */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/clubs/${clubSlug}/books/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();

      // Results come directly from Firestore now
      const books = (data.results || []).map((b: any) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        author: b.authorName,
        coverUrl: b.coverUrl,
        status: b.status,
      }));
      setSearchResults(books);
    } catch (err) {
      console.error('Search failed', err);
      showToast('error', 'Failed to search your library');
    } finally {
      setSearching(false);
    }
  };

  /* ─────────────── Add Book with status ─────────────── */
  const handleAddBook = async (book: Book, status: 'current' | 'nominated' = 'nominated') => {
    if (!isAdmin) return showToast('error', 'Only admins can add books');
    if (!currentUserId) return showToast('error', 'Please sign in to add a book');

    setAdding(true);
    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth) throw new Error('Firebase not initialized');
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in.');

      const token = await user.getIdToken();

      const response = await fetch(`/api/clubs/${clubSlug}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookSlug: book.slug,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          isbn: book.isbn,
          status, // ✅ Controlled explicitly
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add book');

      showToast(
        'success',
        status === 'current'
          ? `✨ "${book.title}" set as currently reading`
          : `📚 "${book.title}" added to nominations`
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
      <div className={styles.panelHeader}>
        <h3 className={styles.title}>Add a Book from Your Library</h3>
        <button className={styles.closeButton} onClick={() => onClose?.()}>
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Search existing club library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div className={styles.resultsSection}>
        {searchResults.length === 0 && !searching && (
          <div className={styles.emptyState}>
            <Book size={40} />
            <p>Search for books already in your library</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className={styles.bookList}>
            {searchResults.map((book) => (
              <div key={book.id} className={styles.bookItem}>
                <div className={styles.bookInfo}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className={styles.bookCover} />
                  ) : (
                    <div className={styles.noCover}>
                      <Book size={32} />
                    </div>
                  )}
                  <div className={styles.bookDetails}>
                    <h4>{book.title}</h4>
                    <p>{book.author}</p>
                    <small>Status: {book.status}</small>
                  </div>
                </div>

                <div className={styles.bookActions}>
                  <button
                    onClick={() => handleAddBook(book, 'current')}
                    disabled={adding}
                    className={styles.setCurrentButton}
                  >
                    <Sparkles size={16} />
                    {adding ? 'Setting...' : 'Set as Current'}
                  </button>

                  <button
                    onClick={() => handleAddBook(book, 'nominated')}
                    disabled={adding}
                    className={styles.addButton}
                  >
                    <Plus size={16} />
                    {adding ? 'Adding...' : 'Nominate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
