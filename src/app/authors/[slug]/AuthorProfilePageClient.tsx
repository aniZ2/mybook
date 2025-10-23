'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthProvider';
import { getDbOrThrow } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Users,
  BookOpen,
  Calendar,
  Heart,
  CheckCircle2,
  Loader2,
  Crown,
  UserCheck,
} from 'lucide-react';
import type { AuthorDoc, BookDoc } from '@/types/firestore';
import styles from './authors.module.css';

/* Lazy-load framer-motion to prevent hydration mismatch */
const MotionDiv = dynamic(async () => (await import('framer-motion')).motion.div, {
  ssr: false,
});

/* ─────────── Safe Date Helpers ─────────── */
function normalizeDate(value: any): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') return new Date(value);
  if (value?.toDate) return value.toDate();
  return new Date(0);
}

function formatTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
  ];
  let i = 0;
  let count = seconds;
  while (i < intervals.length - 1 && count >= intervals[i][0]) {
    count /= intervals[i][0];
    i++;
  }
  count = Math.floor(count);
  const label = intervals[i][1] + (count !== 1 ? 's' : '');
  return count < 1 ? 'Just now' : `${count} ${label} ago`;
}

/* ─────────── Component ─────────── */
export default function AuthorProfilePageClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const identifier = slug;

  const [author, setAuthor] = useState<(AuthorDoc & { id: string; bio?: string }) | null>(null);
  const [books, setBooks] = useState<BookDoc[]>([]);
  const [followers, setFollowers] = useState<{ docId: string; userName: string; slug?: string | null }[]>([]);
  const [following, setFollowing] = useState<{ docId: string; userName: string; slug?: string | null }[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'followers' | 'following'>('followers');
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuRefs = useRef<HTMLLIElement[]>([]);

  /* ─────────── Track client mount ─────────── */
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use bio OR about (whichever exists)
  const bioText = author?.bio || author?.about;

  // Check if current user is the owner (check both ownerUid and userId fields)
  const isOwner = user?.uid && author && (
    user.uid === (author as any).ownerUid || 
    user.uid === (author as any).userId ||
    user.uid === author.id
  );

  // Debug logging for ownership check
  useEffect(() => {
    if (author && user) {
      console.log('🔍 Ownership Check:', {
        userUid: user.uid,
        authorOwnerUid: (author as any).ownerUid,
        authorUserId: (author as any).userId,
        authorId: author.id,
        isOwner: isOwner
      });
    }
  }, [author, user, isOwner]);

  /* ─────────── Fetch Firestore data ─────────── */
  const fetchAuthorData = useCallback(async () => {
    try {
      const db = getDbOrThrow();
      let authorDoc;
      let authorId: string;

      const slugQuery = query(collection(db, 'authors'), where('slug', '==', identifier), limit(1));
      const slugSnap = await getDocs(slugQuery);
      if (!slugSnap.empty) {
        authorDoc = slugSnap.docs[0];
        authorId = authorDoc.id;
      } else {
        const directRef = doc(db, 'authors', identifier);
        const directSnap = await getDoc(directRef);
        if (!directSnap.exists()) throw new Error('Author not found');
        authorDoc = directSnap;
        authorId = directSnap.id;
      }

      const raw = authorDoc.data() as any;
      const authorData = { ...raw, id: authorId };

      setAuthor(authorData);

      if (mounted) {
        setJoinedAt(
          raw.createdAt
            ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(normalizeDate(raw.createdAt))
            : null
        );
      }

      /* Books */
      const booksSnap = await getDocs(query(collection(db, 'books'), where('authorId', '==', authorId)));
      setBooks(booksSnap.docs.map((d) => ({ ...(d.data() as BookDoc), id: d.id })));

      /* Followers / Following / Announcements */
      const followersRef = collection(db, `authors/${authorId}/followers`);
      const followingRef = collection(db, `authors/${authorId}/following`);
      const announcementsRef = collection(db, `authors/${authorId}/announcements`);

      const unsubFollowers = onSnapshot(followersRef, (snap) =>
        setFollowers(snap.docs.map((d) => ({ ...(d.data() as any), docId: d.id })))
      );
      const unsubFollowing = onSnapshot(followingRef, (snap) =>
        setFollowing(snap.docs.map((d) => ({ ...(d.data() as any), docId: d.id })))
      );
      const unsubAnnouncements = onSnapshot(announcementsRef, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt;
          return {
            id: d.id,
            title: data.title || '',
            message: data.message || '',
            createdAt,
            timeAgo: mounted ? formatTimeAgo(normalizeDate(createdAt)) : '',
          };
        });
        setAuthor((prev) => (prev ? { ...prev, announcements: items } : prev));
      });

      /* Follow state */
      let unsubFollowState: (() => void) | undefined;
      if (user?.uid) {
        const followDocRef = doc(db, `authors/${authorId}/followers/${user.uid}`);
        unsubFollowState = onSnapshot(followDocRef, (snap) => setIsFollowing(snap.exists()));
      }

      return () => {
        unsubFollowers();
        unsubFollowing();
        unsubAnnouncements();
        unsubFollowState?.();
      };
    } catch (err) {
      console.error('Error loading author:', err);
    } finally {
      setLoading(false);
    }
  }, [identifier, user?.uid, mounted]);

  useEffect(() => {
    if (mounted) {
      fetchAuthorData();
    }
  }, [fetchAuthorData, mounted]);

  /* ─────────── Close menus outside click ─────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      menuRefs.current.forEach((ref) => {
        if (ref && !ref.contains(e.target as Node)) {
          const dropdown = ref.querySelector(`.${styles.menuDropdown}`);
          dropdown?.classList.remove(styles.showMenu);
        }
      });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  /* ─────────── Refresh "time ago" ─────────── */
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setAuthor((prev) => {
        if (!prev || !prev.announcements) return prev;
        const updatedAnnouncements = prev.announcements.map((a) => ({
          ...a,
          timeAgo: formatTimeAgo(normalizeDate(a.createdAt)),
        }));
        return { ...prev, announcements: updatedAnnouncements };
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [mounted]);

  /* ─────────── Follow / unfollow ─────────── */
  const handleFollow = async () => {
    if (!user) return alert('Please sign in to follow authors.');
    if (!author) return;
    if (isOwner) return alert("You can't follow yourself.");

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/authors/${author.slug}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: author.id, userId: user.uid }),
      });
      if (!res.ok) throw new Error('Failed to toggle follow');
    } catch (err) {
      console.error('Follow error:', err);
      alert('Error updating follow status.');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ─────────── Loading / Error ─────────── */
  if (loading) {
    return (
      <main className={styles.authorPage}>
        <div className={styles.stateContainer}>
          <Loader2 size={40} className={styles.spinner} />
          <p>Loading author profile...</p>
        </div>
      </main>
    );
  }

  if (!author) {
    return (
      <main className={styles.authorPage}>
        <div className={styles.stateContainer}>
          <p>Author not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.authorPage}>
      {/* HEADER */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.frostedHeader}
      >
        <div className={styles.headerContent}>
          {/* Avatar */}
          <div className={styles.avatarWrapper}>
            {author.photoUrl ? (
              <Image
                src={author.photoUrl}
                alt={author.name}
                width={70}
                height={70}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>{author.name.charAt(0)}</div>
            )}
            <div className={styles.premiumBadge}>
              <Crown />
            </div>
          </div>

          {/* Info (now on the right) */}
          <div className={styles.authorInfo}>
            <div className={styles.titleRow}>
              <h1 className={styles.authorName}>{author.name}</h1>
              {!isOwner && (
                <button
                  className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
                  onClick={handleFollow}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 size={16} className={styles.loadingIcon} />
                  ) : isFollowing ? (
                    <>
                      <CheckCircle2 size={16} /> Following
                    </>
                  ) : (
                    <>
                      <Heart size={16} /> Follow
                    </>
                  )}
                </button>
              )}
            </div>

            <div className={styles.statsRow}>
              <span>
                <Users size={14} /> {followers.length} followers
              </span>
              <span>•</span>
              <span>
                <UserCheck size={14} /> {following.length} following
              </span>
              <span>•</span>
              <span>
                <BookOpen size={14} /> {books.length} books
              </span>
              <span suppressHydrationWarning>
                <Calendar size={14} /> Joined {joinedAt || '—'}
              </span>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* BIO SECTION */}
      <div className={styles.bioSection}>
        {bioText ? (
          <p className={styles.bio}>{bioText}</p>
        ) : (
          <p className={styles.bio} style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            No bio added yet.
          </p>
        )}
      </div>

      {/* BOOKS */}
      <section className={styles.booksSection}>
        <h2 className={styles.sectionTitle}>Books by {author.name}</h2>
        {books.length === 0 ? (
          <p className={styles.emptyMessage}>No books yet.</p>
        ) : (
          <div className={styles.booksGrid}>
            {books.map((book) => (
              <Link key={book.slug} href={`/books/${book.slug}`}>
                <div className={styles.bookCard}>
                  <Image
                    src={book.coverUrl || '/placeholder.png'}
                    alt={book.title}
                    width={120}
                    height={180}
                    className={styles.bookCover}
                  />
                  <div className={styles.bookInfo}>
                    <h3 className={styles.bookTitle}>{book.title}</h3>
                    {book.description && <p className={styles.bookDesc}>{book.description.slice(0, 60)}...</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FOLLOWERS + ANNOUNCEMENTS */}
      <section className={styles.connectionsSection}>
        <div className={styles.splitLayout}>
          {/* LEFT: followers/following */}
          <div className={styles.connectionsLeft}>
            <div className={styles.connectionsHeader}>
              <button
                className={`${styles.tabButton} ${view === 'followers' ? styles.activeTab : ''}`}
                onClick={() => setView('followers')}
              >
                Followers ({followers.length})
              </button>
              <button
                className={`${styles.tabButton} ${view === 'following' ? styles.activeTab : ''}`}
                onClick={() => setView('following')}
              >
                Following ({following.length})
              </button>
            </div>

            <div className={`${styles.followersList} ${view === 'followers' ? styles.active : ''}`}>
              {followers.length ? (
                followers.map((f) => (
                  <Link key={f.docId} href={`/authors/${f.slug || f.docId}`} className={styles.simpleListItem}>
                    {f.userName}
                  </Link>
                ))
              ) : (
                <p className={styles.emptyMessage}>No followers yet.</p>
              )}
            </div>

            <div className={`${styles.followingList} ${view === 'following' ? styles.active : ''}`}>
              {following.length ? (
                following.map((f) => (
                  <Link key={f.docId} href={`/authors/${f.slug || f.docId}`} className={styles.simpleListItem}>
                    {f.userName}
                  </Link>
                ))
              ) : (
                <p className={styles.emptyMessage}>Not following anyone yet.</p>
              )}
            </div>
          </div>

          {/* RIGHT: announcements */}
          <div className={styles.announcementsRight}>
            <h3 className={styles.sectionTitle}>Announcements</h3>

            {isOwner && (
              <form
                className={styles.announcementForm}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const title = (form.elements.namedItem('title') as HTMLInputElement)?.value.trim();
                  const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value.trim();
                  
                  if (!title || !message) {
                    alert('Please fill in both title and message fields.');
                    return;
                  }

                  try {
                    const res = await fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        authorId: author.id, 
                        userId: user.uid, // Pass userId for backend verification
                        title, 
                        message 
                      }),
                    });

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      const errorMessage = errorData.error || errorData.message || 'Failed to post announcement';
                      throw new Error(errorMessage);
                    }

                    const data = await res.json();
                    console.log('✅ Announcement posted:', data);
                    form.reset();
                    alert('Announcement posted successfully!');
                  } catch (err: any) {
                    console.error('Error posting announcement:', err);
                    alert(`Error: ${err.message || 'Failed to post announcement'}`);
                  }
                }}
              >
                <input 
                  name="title" 
                  placeholder="Announcement title" 
                  className={styles.announcementInput}
                  maxLength={200}
                />
                <textarea 
                  name="message" 
                  placeholder="Write your announcement..." 
                  className={styles.announcementTextarea}
                  maxLength={5000}
                />
                <button type="submit" className={styles.announcementButton}>
                  Post
                </button>
              </form>
            )}

            {author?.announcements?.length ? (
              <ul className={styles.announcementList}>
                {author.announcements.map((a: any, i: number) => (
                  <li
                    key={a.id || i}
                    className={styles.announcementItem}
                    ref={(el) => {
                      if (el) menuRefs.current[i] = el;
                      else delete menuRefs.current[i];
                    }}
                  >
                    {isOwner && (
                      <div className={styles.menuWrapper}>
                        <button
                          className={styles.menuButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                            menu.classList.toggle(styles.showMenu);
                          }}
                        >
                          ⋯
                        </button>
                        <div className={styles.menuDropdown}>
                          <button
                            onClick={async () => {
                              const title = prompt('Edit title:', a.title);
                              const message = prompt('Edit message:', a.message);
                              if (title && message) {
                                try {
                                  const res = await fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      authorId: author.id, 
                                      userId: user.uid, // Pass userId for backend verification
                                      announcementId: a.id, 
                                      title, 
                                      message 
                                    }),
                                  });
                                  
                                  if (!res.ok) {
                                    const errorData = await res.json().catch(() => ({}));
                                    throw new Error(errorData.error || 'Failed to update');
                                  }
                                  
                                  alert('Announcement updated successfully!');
                                } catch (err: any) {
                                  console.error('Error updating announcement:', err);
                                  alert(`Error: ${err.message || 'Failed to update announcement'}`);
                                }
                              }
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this announcement?')) {
                                try {
                                  const res = await fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      authorId: author.id, 
                                      userId: user.uid, // Pass userId for backend verification
                                      announcementId: a.id 
                                    }),
                                  });
                                  
                                  if (!res.ok) {
                                    const errorData = await res.json().catch(() => ({}));
                                    throw new Error(errorData.error || 'Failed to delete');
                                  }
                                  
                                  alert('Announcement deleted successfully!');
                                } catch (err: any) {
                                  console.error('Error deleting announcement:', err);
                                  alert(`Error: ${err.message || 'Failed to delete announcement'}`);
                                }
                              }
                            }}
                          >
                          🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                    <small suppressHydrationWarning style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {a.timeAgo || (mounted ? formatTimeAgo(normalizeDate(a.createdAt)) : '')}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No announcements yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}