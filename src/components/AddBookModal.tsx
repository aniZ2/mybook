'use client';

import React, { useState } from 'react';
import { X, Search, Book, Plus } from 'lucide-react';
import styles from './AddBookModal.module.css';

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
}

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubSlug: string;
  currentUserId?: string;
  onBookAdded?: () => void;
}

export default function AddBookModal({ isOpen, onClose, clubSlug, currentUserId, onBookAdded }: AddBookModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      console.log('🔍 Searching books for:', searchQuery);
      
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      console.log('✅ Search results:', data.results?.length || 0);
      
      const books: Book[] = (data.results || []).map((result: any) => ({
        id: result.id || result.isbn13 || result.isbn10 || result.title,
        title: result.title,
        author: Array.isArray(result.authors) ? result.authors.join(', ') : (result.authors || 'Unknown Author'),
        coverUrl: result.cover,
        isbn: result.isbn13 || result.isbn10,
      }));
      
      setSearchResults(books);
      
      if (books.length === 0) {
        alert('No books found. Try a different search term.');
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      alert('Failed to search books. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddBook = async (book: Book) => {
    setAdding(true);
    try {
      const response = await fetch(`/api/clubs/${clubSlug}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          isbn: book.isbn,
          userId: currentUserId,
        }),
      });

      if (response.ok) {
        onBookAdded?.();
        onClose();
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add book');
      }
    } catch (error) {
      console.error('Add book error:', error);
      alert('Failed to add book to club');
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add Book to Club</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={styles.searchInput}
            />
            <button 
              onClick={handleSearch} 
              disabled={searching}
              className={styles.searchButton}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className={styles.resultsSection}>
          {searchResults.length === 0 && !searching && (
            <div className={styles.emptyState}>
              <Book size={48} />
              <p>Search for books to add to your club</p>
            </div>
          )}

          {searching && (
            <div className={styles.loadingState}>
              <p>Searching books...</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className={styles.bookList}>
              {searchResults.map((book) => (
                <div key={book.id} className={styles.bookItem}>
                  <div className={styles.bookInfo}>
                    {book.coverUrl && (
                      <img src={book.coverUrl} alt={book.title} className={styles.bookCover} />
                    )}
                    <div>
                      <h3 className={styles.bookTitle}>{book.title}</h3>
                      <p className={styles.bookAuthor}>{book.author}</p>
                      {book.isbn && (
                        <p className={styles.bookIsbn}>ISBN: {book.isbn}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddBook(book)}
                    disabled={adding}
                    className={styles.addButton}
                  >
                    <Plus size={20} />
                    {adding ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}