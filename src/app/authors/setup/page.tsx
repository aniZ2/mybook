'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User, FileText, Link as LinkIcon, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './setup.module.css';

export default function AuthorSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    website: '',
    twitter: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
      return;
    }

    // Load existing author data
    async function loadAuthorData() {
      if (!user) return;
      
      try {
        const db = getDbOrThrow();
        const authorRef = doc(db, 'authors', user.uid);
        const authorSnap = await getDoc(authorRef);

        if (authorSnap.exists()) {
          const data = authorSnap.data();
          setFormData({
            name: data.name || user.displayName || '',
            bio: data.bio || '',
            website: data.website || '',
            twitter: data.twitter || '',
          });
        } else {
          // Initialize with user data
          setFormData(prev => ({
            ...prev,
            name: user.displayName || '',
          }));
        }
      } catch (err) {
        console.error('Error loading author data:', err);
      }
    }

    loadAuthorData();
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDbOrThrow();
      const authorRef = doc(db, 'authors', user.uid); // Using UID as doc ID
      const userRef = doc(db, 'users', user.uid);

      // Update author profile using setDoc with merge (creates if doesn't exist)
      await setDoc(authorRef, {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        twitter: formData.twitter.trim(),
        email: user.email || '',
        photoUrl: user.photoURL || null,
        userId: user.uid,
        slug: null, // No slug for free users
        isPremium: false,
        profileComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Mark user profile as complete
      await setDoc(userRef, {
        profileComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Author profile saved successfully');
      toast.success('🎉 Profile setup complete!');
      
      // Redirect to author profile using UID
      router.push(`/authors/${user.uid}`);
    } catch (err: any) {
      console.error('Error saving author profile:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete Your Author Profile</h1>
          <p className={styles.subtitle}>
            Let readers know who you are and what you write about.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              <User size={18} />
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your full name"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>
              <FileText size={18} />
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell readers about yourself and your writing..."
              className={styles.textarea}
              rows={4}
            />
            <span className={styles.hint}>
              Share your writing style, genres, or what inspires you
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="website" className={styles.label}>
              <LinkIcon size={18} />
              Website
            </label>
            <input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="twitter" className={styles.label}>
              <LinkIcon size={18} />
              Twitter Handle
            </label>
            <input
              id="twitter"
              type="text"
              value={formData.twitter}
              onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
              placeholder="@yourusername"
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? 'Saving...' : 'Complete Setup'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/discover')}
              className={styles.skipButton}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}