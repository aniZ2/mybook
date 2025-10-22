'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import styles from './authors.module.css';

interface Author {
  id: string;
  slug?: string | null;
  name: string;
  bio?: string;
  photoUrl?: string;
  isPremium?: boolean;
  followersCount?: number;
  booksCount?: number;
  createdAt?: any;
  announcements?: any[];
}

interface Book {
  docId: string;
  title: string;
  coverUrl?: string;
  description?: string;
  slug?: string;
}

interface Follower {
  docId: string;
  userName: string;
  slug?: string | null;
}

interface Following {
  docId: string;
  userName: string;
  slug?: string | null;
}

/* Utility — human-readable “time ago” */
function formatTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.MAX_SAFE_INTEGER, 'year'],
  ];

  let i = 0;
  let count = seconds;
  while (i < intervals.length - 1 && count >= intervals[i][0]) {
    count /= intervals[i][0];
    i++;
  }
  count = Math.floor(count);
  const label = intervals[i][1] + (count !== 1 ? 's' : '');
  return count < 1
    ? 'Just now'
    : i === 3 && count === 1
    ? 'Yesterday'
    : `${count} ${label} ago`;
}

export default function AuthorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: identifier } = use(params);
  const { user } = useAuth();

  const [author, setAuthor] = useState<Author | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'followers' | 'following'>('followers');

  const menuRefs = useRef<HTMLLIElement[]>([]);

  /* ════════════════════════════════════════════════
     FETCH AUTHOR DATA + REALTIME SYNC
  ═════════════════════════════════════════════════ */
  const fetchAuthorData = useCallback(async () => {
    try {
      const db = getDbOrThrow();
      let authorDoc;
      let authorId: string;

      const authorsRef = collection(db, 'authors');
      const slugQuery = query(authorsRef, where('slug', '==', identifier), limit(1));
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

      const authorData = { id: authorId, ...authorDoc.data() } as Author;
      setAuthor(authorData);

      // books
      const booksRef = collection(db, 'books');
      const booksQuery = query(booksRef, where('authorId', '==', authorId));
      const booksSnap = await getDocs(booksQuery);
      setBooks(booksSnap.docs.map((d) => ({ ...(d.data() as Book), docId: d.id })));

      // live followers/following
      const followersRef = collection(db, `authors/${authorId}/followers`);
      const followingRef = collection(db, `authors/${authorId}/following`);
      const announcementsRef = collection(db, `authors/${authorId}/announcements`);

      const unsubFollowers = onSnapshot(followersRef, (snap) => {
        setFollowers(snap.docs.map((d) => ({ ...(d.data() as Follower), docId: d.id })));
      });
      const unsubFollowing = onSnapshot(followingRef, (snap) => {
        setFollowing(snap.docs.map((d) => ({ ...(d.data() as Following), docId: d.id })));
      });
      const unsubAnnouncements = onSnapshot(announcementsRef, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          const createdAt =
            data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now());
          return {
            id: d.id,
            ...data,
            createdAt,
            timeAgo: formatTimeAgo(createdAt),
          };
        });
        setAuthor((prev) => (prev ? { ...prev, announcements: items } : prev));
      });

      if (user?.uid) {
        const followDocRef = doc(db, `authors/${authorId}/followers/${user.uid}`);
        const unsubFollowState = onSnapshot(followDocRef, (snap) => {
          setIsFollowing(snap.exists());
        });
        return () => {
          unsubFollowers();
          unsubFollowing();
          unsubAnnouncements();
          unsubFollowState();
        };
      }

      return () => {
        unsubFollowers();
        unsubFollowing();
        unsubAnnouncements();
      };
    } catch (err) {
      console.error('Error loading author:', err);
    } finally {
      setLoading(false);
    }
  }, [identifier, user?.uid]);

  useEffect(() => {
    fetchAuthorData();
  }, [fetchAuthorData]);

  /* Close open menus when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      menuRefs.current.forEach((ref) => {
        if (ref && !ref.contains(e.target as Node)) {
          const dropdown = ref.querySelector(`.${styles.menuDropdown}`);
          dropdown?.classList.remove(styles.showMenu);
        }
      });
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  /* Auto-refresh “time ago” every 60 s */
  useEffect(() => {
    const interval = setInterval(() => {
      setAuthor((prev) =>
        prev
          ? {
              ...prev,
              announcements: prev.announcements?.map((a) => ({
                ...a,
                timeAgo: formatTimeAgo(new Date(a.createdAt)),
              })),
            }
          : prev
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ════════════════════════════════════════════════
     FOLLOW / UNFOLLOW
  ═════════════════════════════════════════════════ */
  const handleFollow = async () => {
    if (!user) return alert('Please sign in to follow authors.');
    if (!author) return;
    if (author.id === user.uid) return alert("You can’t follow yourself.");

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/authors/${author.slug || author.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Failed to update follow status');
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Follow/unfollow failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /* ════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════ */
  if (loading)
    return (
      <main className={styles.stateContainer}>
        <Loader2 className={styles.spinner} size={28} />
        <p>Loading author...</p>
      </main>
    );

  if (!author)
    return (
      <main className={styles.stateContainer}>
        <h2>Author not found.</h2>
      </main>
    );

  return (
    <main className={styles.authorPage}>
      {/* HEADER */}
      <motion.div
        className={styles.frostedHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.avatarWrapper}>
            {author.photoUrl ? (
              <img src={author.photoUrl} alt={author.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{author.name.charAt(0)}</div>
            )}
            {author.isPremium && (
              <div className={styles.premiumBadge}>
                <Crown size={16} />
              </div>
            )}
          </div>

          <div className={styles.authorInfo}>
            <div className={styles.titleRow}>
              <h1 className={styles.authorName}>{author.name}</h1>
              {user?.uid !== author.id && (
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
            {author.bio && <p className={styles.bio}>{author.bio}</p>}

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
                <BookOpen size={14} /> {author.booksCount ?? books.length} books
              </span>
              <span>•</span>
              <span>
                <Calendar size={14} /> Joined{' '}
                {new Date(author.createdAt?.toDate?.() ?? Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BOOKS */}
      <section className={styles.booksSection}>
        <h2 className={styles.sectionTitle}>Books by {author.name}</h2>
        {books.length === 0 ? (
          <p className={styles.emptyMessage}>No books yet.</p>
        ) : (
          <div className={styles.booksGrid}>
            {books.map((book) => (
              <Link key={book.docId} href={`/books/${book.slug || book.docId}`}>
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
                    {book.description && (
                      <p className={styles.bookDesc}>{book.description.slice(0, 60)}...</p>
                    )}
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
          {/* LEFT: Followers / Following */}
          <div className={styles.connectionsLeft}>
            <div className={styles.connectionsHeader}>
              <button
                className={`${styles.tabButton} ${
                  view === 'followers' ? styles.activeTab : ''
                }`}
                onClick={() => setView('followers')}
              >
                Followers ({followers.length})
              </button>
              <button
                className={`${styles.tabButton} ${
                  view === 'following' ? styles.activeTab : ''
                }`}
                onClick={() => setView('following')}
              >
                Following ({following.length})
              </button>
            </div>

            <div className={styles.followersList + ' ' + (view === 'followers' ? styles.active : '')}>
              {followers.length ? (
                followers.map((f) => (
                  <Link
                    key={f.docId}
                    href={`/authors/${f.slug || f.docId}`}
                    className={styles.simpleListItem}
                  >
                    {f.userName}
                  </Link>
                ))
              ) : (
                <p className={styles.emptyMessage}>No followers yet.</p>
              )}
            </div>

            <div className={styles.followingList + ' ' + (view === 'following' ? styles.active : '')}>
              {following.length ? (
                following.map((f) => (
                  <Link
                    key={f.docId}
                    href={`/authors/${f.slug || f.docId}`}
                    className={styles.simpleListItem}
                  >
                    {f.userName}
                  </Link>
                ))
              ) : (
                <p className={styles.emptyMessage}>Not following anyone yet.</p>
              )}
            </div>
          </div>

          {/* RIGHT: Announcements */}
          <div className={styles.announcementsRight}>
            <h3 className={styles.sectionTitle}>Announcements</h3>

            {user?.uid === author.id && (
              <form
                className={styles.announcementForm}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
                  const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value.trim();
                  if (!title || !message) return alert('Fill in both fields.');
                  try {
                    const res = await fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ authorId: author.id, title, message }),
                    });
                    if (!res.ok) throw new Error('Failed to post');
                    form.reset();
                  } catch {
                    alert('Error posting announcement');
                  }
                }}
              >
                <input name="title" placeholder="Announcement title" className={styles.announcementInput} />
                <textarea
                  name="message"
                  placeholder="Write your announcement..."
                  className={styles.announcementTextarea}
                />
                <button type="submit" className={styles.announcementButton}>Post</button>
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
                    {user?.uid === author.id && (
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
                            onClick={() => {
                              const title = prompt('Edit title:', a.title);
                              const message = prompt('Edit message:', a.message);
                              if (title && message)
                                fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    authorId: author.id,
                                    announcementId: a.id,
                                    title,
                                    message,
                                  }),
                                });
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this announcement?'))
                                fetch(`/api/authors/${author.slug || author.id}/announcements`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    authorId: author.id,
                                    announcementId: a.id,
                                  }),
                                });
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                    <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {a.timeAgo || formatTimeAgo(new Date(a.createdAt))}
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
