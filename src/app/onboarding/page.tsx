'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BookOpen, PenTool } from 'lucide-react';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [loading, user, router]);

  const handleSelect = async (role: 'reader' | 'author') => {
    if (!user) {
      setError('Please sign in to continue');
      router.push('/signup');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const db = getDbOrThrow();
      const userRef = doc(db, 'users', user.uid);

      // Save user role
      await setDoc(
        userRef,
        {
          role,
          isAuthor: role === 'author',
          profileComplete: false,
          isPremium: false, // New field for premium status
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅ Role saved as ${role} for user ${user.uid}`);

      if (role === 'author') {
        // Create initial author document with UID as document ID
        const authorRef = doc(db, 'authors', user.uid);
        
        await setDoc(authorRef, {
          name: user.displayName || '',
          email: user.email || '',
          bio: '',
          slug: null, // No slug yet - premium feature!
          photoUrl: user.photoURL || null,
          userId: user.uid,
          isPremium: false,
          profileComplete: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        console.log('✅ Initial author profile created with UID');
        
        // Redirect to author profile setup
        router.push('/authors/setup');
      } else {
        // Readers can go straight to discover
        await setDoc(
          userRef,
          { profileComplete: true },
          { merge: true }
        );
        router.push('/discover');
      }
    } catch (err: any) {
      console.error('❌ Failed to save role:', err);
      setError('Something went wrong while saving your choice. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className={styles.title}>Welcome to Booklyverse ✨</h1>
        <p className={styles.subtitle}>Choose how you'll experience the story.</p>

        <div className={styles.userHint}>
          Signed in as <strong>{user.email}</strong>
        </div>

        <div className={styles.buttonGrid}>
          <motion.button
            className={`${styles.roleButton} ${styles.reader}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect('reader')}
            disabled={isProcessing}
          >
            <BookOpen size={40} />
            <div>
              <h3>I'm a Reader</h3>
              <p>Discover and enjoy amazing books.</p>
            </div>
          </motion.button>

          <motion.button
            className={`${styles.roleButton} ${styles.author}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect('author')}
            disabled={isProcessing}
          >
            <PenTool size={40} />
            <div>
              <h3>I'm an Author</h3>
              <p>Write and publish your stories.</p>
            </div>
          </motion.button>
        </div>

        {isProcessing && (
          <p className={styles.loadingText}>
            Setting up your account...
          </p>
        )}
        {error && <p className={styles.errorText}>{error}</p>}
      </motion.div>
    </main>
  );
}