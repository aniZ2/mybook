'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { User, FileText, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './setup.module.css';
import { updateAuthorCache } from '@/app/actions/authorActions'; // 👈 CHANGE THIS

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
  const [bioWordCount, setBioWordCount] = useState(0);

  const countWords = (text: string): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBio = e.target.value;
    const wordCount = countWords(newBio);

    if (wordCount <= 100) {
      setFormData({ ...formData, bio: newBio });
      setBioWordCount(wordCount);
    } else {
      const words = newBio.trim().split(/\s+/);
      const trimmedBio = words.slice(0, 100).join(' ');
      setFormData({ ...formData, bio: trimmedBio });
      setBioWordCount(100);
      toast.error('Bio limited to 100 words');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
      return;
    }

    async function loadAuthorData() {
      if (!user) return;
      
      try {
        const db = getDbOrThrow();
        const authorRef = doc(db, 'authors', user.uid);
        const authorSnap = await getDoc(authorRef);

        if (authorSnap.exists()) {
          const data = authorSnap.data();
          const loadedBio = data.bio || '';
          setFormData({
            name: data.name || user.displayName || '',
            bio: loadedBio,
            website: data.website || '',
            twitter: data.twitter || '',
          });
          setBioWordCount(countWords(loadedBio));
        } else {
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

    const bioWords = countWords(formData.bio);
    if (bioWords > 100) {
      toast.error('Bio must be 100 words or less');
      return;
    }

    setIsSubmitting(true);

    try {
      const db = getDbOrThrow();
      const authorRef = doc(db, 'authors', user.uid);
      const userRef = doc(db, 'users', user.uid);

      const authorSnap = await getDoc(authorRef);
      const isNewAuthor = !authorSnap.exists();

      // 1. Create/update author in Firestore
      await setDoc(authorRef, {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        twitter: formData.twitter.trim(),
        email: user.email || '',
        photoUrl: user.photoURL || null,
        userId: user.uid,
        slug: null,
        isPremium: false,
        profileComplete: true,
        createdAt: isNewAuthor ? serverTimestamp() : authorSnap.data()?.createdAt,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await setDoc(userRef, {
        profileComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Author profile saved');

      // 2. Update both caches (via server action)
      if (isNewAuthor) {
        const result = await updateAuthorCache(user.uid); // 👈 CALL SERVER ACTION
        
        if (result.success) {
          console.log('🎉 Both caches updated!');
        } else {
          console.error('⚠️ Cache update failed (non-critical)');
        }
      }

      toast.success('🎉 Profile setup complete!');
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

  const getWordCountColor = () => {
    if (bioWordCount >= 100) return '#ef4444';
    if (bioWordCount >= 90) return '#f59e0b';
    return '#94a3b8';
  };

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
              onChange={handleBioChange}
              placeholder="Tell readers about yourself and your writing..."
              className={styles.textarea}
              rows={4}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '0.5rem'
            }}>
              <span className={styles.hint}>
                Share your writing style, genres, or what inspires you
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 500,
                color: getWordCountColor(),
                transition: 'color 0.2s ease'
              }}>
                {bioWordCount}/100 words
              </span>
            </div>
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