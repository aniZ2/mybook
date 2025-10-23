'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Crown } from 'lucide-react';
import styles from './authorsList.module.css';

interface Author {
  id: string;
  slug?: string | null;
  name: string;
  bio?: string;
  photoUrl?: string;
  isPremium?: boolean;
  followersCount?: number;
  booksCount?: number;
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ FIXED - removed cache: 'no-store'
      const response = await fetch('/api/authors?pageSize=9');
      
      if (!response.ok) {
        throw new Error('Failed to fetch authors');
      }

      const data = await response.json();
      setAuthors(data.authors || []);
      
      console.log('📚 Loaded authors:', data.authors?.length);
    } catch (err) {
      console.error('Error fetching authors:', err);
      setError('Failed to load authors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const getAuthorUrl = (author: Author) => {
    return `/authors/${author.isPremium && author.slug ? author.slug : author.id}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spin} size={48} />
        <h2>Loading authors...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.stateContainer}>
        <h2>Oops!</h2>
        <p>{error}</p>
        <button 
          onClick={fetchAuthors}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </main>
    );
  }

  if (authors.length === 0) {
    return (
      <main className={styles.stateContainer}>
        <h2>No authors yet</h2>
        <p>Once authors join, you'll see them here!</p>
      </main>
    );
  }

  return (
    <main className={styles.authorsPage}>
      <motion.div
        className={styles.headerContainer}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className={styles.title}>Our Authors</h1>
        <p className={styles.subtitle}>
          Discover talented authors sharing their stories and building literary worlds.
        </p>
      </motion.div>

      <div className={styles.grid}>
        {authors.map((author) => (
          <Link key={author.id} href={getAuthorUrl(author)}>
            <div className={styles.card}>
              <div className={styles.avatarWrapper}>
                {author.photoUrl ? (
                  <img
                    src={author.photoUrl}
                    alt={author.name}
                    className={styles.avatarImg}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {getInitials(author.name)}
                  </div>
                )}
                {author.isPremium && (
                  <div className={styles.premiumBadge} title="Premium Author">
                    <Crown size={14} />
                  </div>
                )}
              </div>

              <h2 className={styles.name}>{author.name}</h2>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}