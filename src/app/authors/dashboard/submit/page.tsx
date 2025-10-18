'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import styles from './submit.module.css';
import { slugify } from '@/lib/slug';

export default function SubmitAuthorPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Become an Author</h1>
        <p className={styles.subtitle}>You must be logged in to continue.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !bio.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const db = getDbOrThrow();

      const slug = slugify(name);
      const authorRef = doc(db, 'authors', slug);

      await setDoc(authorRef, {
        ownerUid: user.uid,
        name,
        slug,
        about: bio,
        photoUrl: photoUrl || null,
        followersCount: 0,
        theme: {
          bg: '#0b0b1a',
          fg: '#ffffff',
          accent: '#ffb703',
          coverUrl: null,
        },
        nav: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push(`/authors/${slug}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create author profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Become an Author</h1>
        <p className={styles.subtitle}>
          Create your author profile and start sharing your stories with the world.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zara Cole"
            className={styles.input}
          />

          <label className={styles.label}>Short Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell readers about yourself..."
            className={styles.textarea}
          />

          <label className={styles.label}>Avatar URL (optional)</label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className={styles.input}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Author Profile'}
          </button>
        </form>
      </div>

      {name && (
        <div className={styles.preview}>
          <div className={styles.previewCard}>
            <img
              src={photoUrl || '/placeholder-author.png'}
              alt={name}
              className={styles.previewAvatar}
            />
            <h3 className={styles.previewName}>{name}</h3>
            <p className={styles.previewBio}>{bio || 'Your bio will appear here.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
