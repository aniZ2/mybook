'use client';

import React, { useEffect, useState, use } from 'react'; // 👈 add `use`
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import styles from './BookDiscussionPage.module.css';
import {
  Send,
  MessageCircle,
  Loader2,
  UserCircle,
  Globe,
  Lock,
} from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  text: string;
  createdAt: any;
  userName?: string;
  clubSlug?: string | null;
  clubVisibility?: 'public' | 'private' | null;
}

interface Book {
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string;
  description?: string;
}

// ✅ Update the signature: params is now a Promise
export default function BookDiscussionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params); // ✅ unwrap with React.use()

  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clubSlug = searchParams.get('club');
  const db = getDbOrThrow();

  const [book, setBook] = useState<Book | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [globalView, setGlobalView] = useState(false);
  const [clubVisibility, setClubVisibility] =
    useState<'public' | 'private'>('private');

  /* ─────────────── Fetch book ─────────────── */
  useEffect(() => {
    const loadBook = async () => {
      const snap = await getDoc(doc(db, 'books', slug));
      if (snap.exists()) setBook({ slug, ...(snap.data() as any) });
    };
    loadBook();
  }, [slug, db]);

  /* ─────────────── Fetch club visibility ─────────────── */
  useEffect(() => {
    if (!clubSlug) return;
    const fetchVisibility = async () => {
      const clubRef = doc(db, 'clubs', clubSlug);
      const clubSnap = await getDoc(clubRef);
      if (clubSnap.exists()) {
        const vis = clubSnap.data()?.visibility || 'private';
        setClubVisibility(vis);
      }
    };
    fetchVisibility();
  }, [clubSlug, db]);

  /* ─────────────── Real-time discussion ─────────────── */
  useEffect(() => {
    let q;
    if (globalView) {
      q = query(
        collection(db, 'books', slug, 'discussions'),
        where('clubVisibility', 'in', ['public', null]),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else if (clubSlug) {
      q = query(
        collection(db, 'books', slug, 'discussions'),
        where('clubSlug', '==', clubSlug),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      setMessages([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [slug, clubSlug, globalView, db]);

  /* ─────────────── Post new message ─────────────── */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    let clubVisToSave: 'public' | 'private' | null = null;

    if (!globalView && clubSlug) {
      const clubSnap = await getDoc(doc(db, 'clubs', clubSlug));
      clubVisToSave = clubSnap.data()?.visibility || 'private';
    }

    await addDoc(collection(db, 'books', slug, 'discussions'), {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      text,
      createdAt: serverTimestamp(),
      clubSlug: globalView ? null : clubSlug,
      clubVisibility: globalView ? 'public' : clubVisToSave,
    });
  };

  /* ─────────────── UI ─────────────── */
  if (!book) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        <p>Loading book...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bookHeader}>
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className={styles.cover} />
        ) : (
          <div className={styles.noCover}>
            <MessageCircle size={40} />
          </div>
        )}
        <div className={styles.meta}>
          <h1>{book.title}</h1>
          <p className={styles.author}>by {book.authorName}</p>
        </div>
      </div>

      {clubSlug && (
        <div className={styles.viewToggle}>
          <button
            className={!globalView ? styles.activeToggle : ''}
            onClick={() => setGlobalView(false)}
          >
            <Lock size={14} /> Club-only
          </button>
          <button
            className={globalView ? styles.activeToggle : ''}
            onClick={() => setGlobalView(true)}
          >
            <Globe size={14} /> Global thread
          </button>
        </div>
      )}

      <div className={styles.chatSection}>
        <h2 className={styles.sectionTitle}>
          <MessageCircle size={18} />{' '}
          {globalView ? 'Global Discussion' : 'Club Discussion'}
        </h2>

        {loading ? (
          <div className={styles.loadingFeed}>
            <Loader2 className={styles.spinner} />
            <p>Loading discussion...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageCircle size={28} />
            <p>No discussions yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${
                  msg.userId === user?.uid ? styles.mine : ''
                }`}
              >
                <div className={styles.avatar}>
                  <UserCircle size={20} />
                </div>
                <div className={styles.bubble}>
                  <div className={styles.userName}>{msg.userName}</div>
                  <div className={styles.text}>{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={handleSend} className={styles.inputBar}>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Share your thoughts about this book... ${
              globalView ? '(Global)' : '(Club-only)'
            }`}
          />
          <button type="submit" disabled={!newMessage.trim()}>
            <Send size={18} />
          </button>
        </form>
      ) : (
        <p className={styles.signInPrompt}>Sign in to join the discussion.</p>
      )}
    </div>
  );
}
