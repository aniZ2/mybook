// ═══════════════════════════════════════════════════════════
// 2. VoteForNextRead.tsx - Fixed
// ═══════════════════════════════════════════════════════════
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { getDbOrThrow } from '@/lib/firebase';
import { BookOpen, ThumbsUp, Loader2, Check, RefreshCcw, PlayCircle, Crown } from 'lucide-react';
import styles from './VoteForNextRead.module.css';

interface Candidate {
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string;
}

interface Props {
  clubSlug: string;
  isAdmin?: boolean;
}

export default function VoteForNextRead({ clubSlug, isAdmin }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roundActive, setRoundActive] = useState(false);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clubs/${clubSlug}`);
      const data = await res.json();
      setCandidates(data.nextCandidates || []);
      setRoundActive(data.roundActive || false);
    } catch (err) {
      console.error('❌ Error loading candidates', err);
    } finally {
      setLoading(false);
    }
  }, [clubSlug]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleVote = async (bookSlug: string) => {
    if (voted || busy) return;
    setBusy(bookSlug);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in to vote');
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${clubSlug}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookSlug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to vote');
      setVoted(true);
      alert('✅ Your vote has been recorded!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Voting failed');
    } finally {
      setBusy(null);
    }
  };

  const adminAction = async (action: 'start' | 'declare' | 'reset') => {
    if (!isAdmin) return;
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in as admin');
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${clubSlug}/round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      alert(data.message || 'Action completed');
      fetchCandidates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error performing action');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} /> Loading nominations...
      </div>
    );
  }

  if (candidates.length === 0 && !roundActive && !isAdmin) {
    return (
      <div className={styles.emptyState}>
        <BookOpen size={32} />
        <p>No active voting rounds</p>
      </div>
    );
  }

  return (
    <div className={styles.voteSection}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>Vote for the Next Read</h3>
        {isAdmin && (
          <div className={styles.adminTools}>
            {!roundActive && (
              <button
                onClick={() => adminAction('start')}
                className={`${styles.adminBtn} ${styles.start}`}
              >
                <PlayCircle size={14} /> Start
              </button>
            )}
            {roundActive && (
              <>
                <button
                  onClick={() => adminAction('declare')}
                  className={`${styles.adminBtn} ${styles.declare}`}
                >
                  <Crown size={14} /> Declare
                </button>
                <button
                  onClick={() => adminAction('reset')}
                  className={`${styles.adminBtn} ${styles.reset}`}
                >
                  <RefreshCcw size={14} /> Reset
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {roundActive ? (
        <div className={styles.candidateList}>
          {candidates.map((c) => (
            <div key={c.slug} className={styles.candidateCard}>
              <img
                src={c.coverUrl || '/placeholder-book.png'}
                alt={c.title}
                className={styles.cover}
              />
              <div className={styles.info}>
                <h4>{c.title}</h4>
                <p>by {c.authorName}</p>
              </div>
              <button
                onClick={() => handleVote(c.slug)}
                disabled={voted || busy === c.slug}
                className={voted ? styles.votedBtn : styles.voteBtn}
              >
                {voted ? (
                  <>
                    <Check size={16} /> Voted
                  </>
                ) : busy === c.slug ? (
                  <>
                    <Loader2 size={16} className="spin" /> Voting...
                  </>
                ) : (
                  <>
                    <ThumbsUp size={16} /> Vote
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.inactiveText}>
          {isAdmin
            ? 'No active voting round. Start one when ready.'
            : 'Voting round has not started yet.'}
        </p>
      )}
    </div>
  );
}
