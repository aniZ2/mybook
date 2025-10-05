'use client';

import React, { useState } from 'react';
import { toggleLike, toggleSave } from '@/lib/firestoreFunctions';
import styles from './DiscoverPage.module.css';
import { BookDoc } from '@/types/firestore';

interface BookCardProps {
  book: BookDoc; // ✅ use your shared Firestore type
  user?: { uid: string };
}

export default function BookCard({ book, user }: BookCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLike = async () => {
    if (!user) return alert('Sign in to like books');
    await toggleLike(book.id, user.uid, liked);
    setLiked(!liked);
  };

  const handleSave = async () => {
    if (!user) return alert('Sign in to save books');
    await toggleSave(book.id, user.uid, saved);
    setSaved(!saved);
  };

  return (
    <div className={styles.card}>
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={book.title}
          className={styles.cover}
        />
      )}
      <h3>{book.title}</h3>
      <p className={styles.author}>by {book.authorName}</p>

      <p className={styles.stats}>
        ❤️ {book.likesCount ?? 0} &nbsp; 💬 {book.commentsCount ?? 0} &nbsp; 🔖 {book.savesCount ?? 0}
      </p>

      <div className={styles.actions}>
        <button
          onClick={handleLike}
          className={liked ? styles.liked : ''}
        >
          ❤️ Like
        </button>
        <button
          onClick={handleSave}
          className={saved ? styles.saved : ''}
        >
          🔖 Save
        </button>
      </div>
    </div>
  );
}
