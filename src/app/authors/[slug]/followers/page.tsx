'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import styles from '../authors.module.css';
import type { AuthorDoc, UserDoc } from '@/types/firestore';

export default function FollowersPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [author, setAuthor] = useState<AuthorDoc | null>(null);
  const [followers, setFollowers] = useState<(UserDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const db = getDbOrThrow();

    // 🔹 Listen to author doc for real-time follower count
    const authorRef = doc(db, 'authors', slug);
    const unsubAuthor = onSnapshot(authorRef, (snap) => {
      if (snap.exists()) setAuthor(snap.data() as AuthorDoc);
    });

    // 🔹 Fetch followers list (static or you can wrap in onSnapshot if you want real-time)
    const loadFollowers = async () => {
      try {
        const followersRef = collection(db, 'authors', slug, 'followers');
        const q = query(followersRef, orderBy('followedAt', 'desc'));
        const snaps = await getDocs(q);

        const followerData = snaps.docs.map((d) => ({
          id: d.id,
          ...(d.data() as UserDoc),
        })) as (UserDoc & { id: string })[];

        setFollowers(followerData);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFollowers();
    return () => unsubAuthor();
  }, [slug]);

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading followers...</p>
      </main>
    );
  }

  if (error || !author) {
    return (
      <main className={styles.stateContainer}>
        <p>{error || 'Author not found.'}</p>
        <Link href={`/authors/${slug}`} className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Author
        </Link>
      </main>
    );
  }

  const followersCount = author.followersCount ?? followers.length;

  return (
    <main className={styles.authorPage}>
      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <motion.div
        className={styles.frostedHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.avatarWrapper}>
            {author.photoUrl ? (
              <Image
                src={author.photoUrl}
                alt={author.name}
                width={80}
                height={80}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.authorInfo}>
            <h1 className={styles.authorName}>{author.name}</h1>
            <p className={styles.bio}>Followers</p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════ FOLLOWERS LIST ═══════════════════════════ */}
      <section className={styles.booksSection}>
        <h2 className={styles.sectionTitle}>
          <Users size={16} /> {followersCount} follower
          {followersCount !== 1 && 's'}
        </h2>

        {followers.length === 0 ? (
          <p className={styles.emptyMessage}>No followers yet.</p>
        ) : (
          <div className={styles.followersGrid}>
            {followers.map((follower) => (
              <Link
                key={follower.id}
                href={`/users/${follower.slug || follower.id}`}
              >
                <div className={styles.followerCard}>
                  {follower.photoURL ? (
                    <Image
                      src={follower.photoURL}
                      alt={follower.displayName || 'User'}
                      width={60}
                      height={60}
                      className={styles.followerAvatar}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {(follower.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.followerInfo}>
                    <p className={styles.followerName}>
                      {follower.displayName || 'Reader'}
                    </p>
                    {follower.role && (
                      <p className={styles.followerRole}>{follower.role}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
