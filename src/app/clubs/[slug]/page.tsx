'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ClubHeader from '@/components/ClubHeader';
import ClubFeed from '@/components/ClubFeed';
import ClubSpotlight from '@/components/ClubSpotlight';
import ClubBooks from '@/components/ClubBooks';
import { useAuth } from '@/context/AuthProvider';
import { Send, X } from 'lucide-react';
import toast from 'react-hot-toast'; // ✅ toast system
import styles from '../ClubsPage.module.css';

interface Club {
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
  createdAt?: string;
  memberIds?: string[];
  ownerUid?: string;
  currentBookId?: string;
  pastBookIds?: string[];
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

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();

  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshBooks, setRefreshBooks] = useState(0);

  /* ─────────────── Fetch Club Data ─────────────── */
  const fetchClubData = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (user) {
        const token = await (user as any).getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/clubs/${slug}`, { headers });
      if (!res.ok) throw new Error('Club not found');
      const data = await res.json();

      console.log('📊 Fetched club data:', {
        currentBookId: data.club?.currentBookId,
        pastBookIds: data.club?.pastBookIds,
        booksCount: data.club?.booksCount,
      });

      setClubData(data);
    } catch (err) {
      console.error('Error fetching club data:', err);
      setClubData(null);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  /* ─────────────── Callbacks ─────────────── */
  const handleJoinSuccess = (newMemberCount: number) => {
    if (clubData?.club && user?.uid) {
      toast.success('✨ Joined club successfully!');
      setClubData({
        ...clubData,
        club: {
          ...clubData.club,
          membersCount: newMemberCount,
          memberIds: [...(clubData.club.memberIds || []), user.uid],
        },
      });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to create a post');
      return;
    }

    if (!postContent.trim()) return;

    setSubmitting(true);

    try {
      const token = await (user as any).getIdToken();

      const response = await fetch(`/api/clubs/${slug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: postContent.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      setPostContent('');
      setShowCreatePost(false);
      toast.success('📚 Post shared with your club!');
      await fetchClubData();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create post'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────── Loading / Error States ─────────────── */
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

  /* ─────────────── Render ─────────────── */
  const { club, posts = [], events, announcements } = clubData;

  return (
    <main className={styles.redditLayout}>
      {/* HEADER */}
      <motion.div
        className={styles.headerContainer}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ClubHeader
          club={club}
          currentUserId={user?.uid}
          onJoinSuccess={handleJoinSuccess}
        />
      </motion.div>

      {/* MAIN CONTENT */}
      <div className={styles.contentWrapper}>
        <section className={styles.feedArea}>
          {/* ✅ Unified books section (includes nomination & voting) */}
          <ClubBooks
            clubSlug={slug}
            isAdmin={user?.uid === club.ownerUid}
            key={refreshBooks}
          />

          {/* Spotlight section (events + announcements) */}
          {((events && events.length > 0) ||
            (announcements && announcements.length > 0)) && (
            <ClubSpotlight events={events} announcements={announcements} />
          )}

          {/* CREATE POST */}
          {user && (
            <motion.div
              className={styles.createPostCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {!showCreatePost ? (
                <button
                  className={styles.createPostButton}
                  onClick={() => setShowCreatePost(true)}
                >
                  <div className={styles.userAvatar}>
                    {user.displayName?.[0]?.toUpperCase() ||
                      user.email?.[0]?.toUpperCase() ||
                      '?'}
                  </div>
                  <span className={styles.createPostPlaceholder}>
                    Share something with the club...
                  </span>
                </button>
              ) : (
                <form className={styles.createPostForm} onSubmit={handleCreatePost}>
                  <div className={styles.createPostHeader}>
                    <h3>Create a Post</h3>
                    <button
                      type="button"
                      className={styles.closeButton}
                      onClick={() => {
                        setShowCreatePost(false);
                        setPostContent('');
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <textarea
                    className={styles.createPostTextarea}
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={5}
                    disabled={submitting}
                    autoFocus
                  />
                  <div className={styles.createPostActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => {
                        setShowCreatePost(false);
                        setPostContent('');
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitPostButton}
                      disabled={!postContent.trim() || submitting}
                    >
                      <Send size={16} />
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* POSTS FEED */}
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
              {user && !showCreatePost && (
                <button
                  className={styles.newPostButton}
                  onClick={() => setShowCreatePost(true)}
                >
                  + Create a Post
                </button>
              )}
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}
