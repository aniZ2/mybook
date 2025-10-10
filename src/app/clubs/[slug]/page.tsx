'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ClubHeader from '@/components/ClubHeader';
import ClubFeed from '@/components/ClubFeed';
import ClubSpotlight from '@/components/ClubSpotlight';
import ClubSidebar from '@/components/ClubSidebar';
import styles from '../ClubsPage.module.css';

interface Club {
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
  createdAt?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
}

interface ClubData {
  club: Club;
  posts?: any[];
  events?: Event[];
  announcements?: Announcement[];
}

export default function ClubsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}`);
        if (!res.ok) throw new Error('Club not found');
        const data = await res.json();
        setClubData(data);
      } catch (err) {
        console.error('Error fetching club data:', err);
        setClubData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <main className={styles.stateContainer}>
        <h2>Loading club details...</h2>
      </main>
    );
  }

  if (!clubData?.club) {
    return (
      <main className={styles.stateContainer}>
        <h1>Club Not Found</h1>
        <p className={styles.stateHint}>Try again later.</p>
      </main>
    );
  }

  const { club, posts = [], events, announcements } = clubData;

  return (
    <main className={styles.redditLayout}>
      {/* ───── Sticky Club Header ───── */}
      <motion.div
        className={styles.headerContainer}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ClubHeader club={club} />
      </motion.div>

      {/* ───── Main Feed ───── */}
      <section className={styles.feedArea}>
        {posts.length > 0 ? (
          <ClubFeed posts={posts} />
        ) : (
          <motion.div
            className={styles.emptyFeed}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>No posts yet 👀</h3>
            <p>Be the first to share something uplifting today ✨</p>
            <button className={styles.newPostButton}>+ Create a Post</button>
          </motion.div>
        )}
      </section>

      {/* ───── Sidebar ───── */}
      <aside className={styles.sidebarArea}>
        <ClubSidebar club={club} />
        
        <ClubSpotlight 
          events={events}
          announcements={announcements}
        />
      </aside>
    </main>
  );
}