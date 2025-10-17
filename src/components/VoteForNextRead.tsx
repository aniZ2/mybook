'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { Loader2, RefreshCcw, PlayCircle, Crown, Plus } from 'lucide-react';
import styles from './VoteForNextRead.module.css';
import BookSearchPanel, { BookItem } from '@/components/BookSearchPanel';

interface Candidate {
  slug: string;
  title: string;
  authorName: string;
  coverUrl?: string;
}

interface Props {
  clubSlug: string;
  isAdmin?: boolean;
  onRefresh?: () => void; // optional: for parent to refetch when nominations change
}

export default function VoteForNextRead({ clubSlug, isAdmin, onRefresh }: Props) {
  const [roundActive, setRoundActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNominateForm, setShowNominateForm] = useState(false);

  /* ─────────────── Fetch Current Round ─────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clubs/${clubSlug}`);
      const data = await res.json();
      setRoundActive(data.roundActive || false);
    } catch (err) {
      console.error('❌ Error loading round status', err);
    } finally {
      setLoading(false);
    }
  }, [clubSlug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /* ─────────────── Nominate a Book ─────────────── */
  const handleNominateSelected = async (b: BookItem) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in as admin');
      const token = await user.getIdToken();

      const res = await fetch(`/api/clubs/${clubSlug}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: b.title,
          author: b.authors?.[0] || 'Unknown',
          coverUrl: b.cover || null,
          nominateForNext: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nomination failed');

      alert(`✅ “${b.title}” nominated for voting!`);
      setShowNominateForm(false);
      fetchStatus();
      onRefresh?.(); // optional: notify parent to reload list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nomination failed');
    }
  };

  /* ─────────────── Admin Actions ─────────────── */
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
      fetchStatus();
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error performing action');
    }
  };

  /* ─────────────── Render ─────────────── */
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} /> Loading status...
      </div>
    );
  }

  return (
    <div className={styles.voteSection}>
      {isAdmin && (
        <>
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

          {/* ─────────────── Nomination Tool ─────────────── */}
          {!roundActive && (
            <>
              {!showNominateForm && (
                <button
                  onClick={() => setShowNominateForm(true)}
                  className={styles.nominateBtn}
                >
                  <Plus size={16} /> Nominate a Book
                </button>
              )}

              {showNominateForm && (
                <div className={styles.nominateForm}>
                  <BookSearchPanel onSelect={handleNominateSelected} />
                  <button
                    onClick={() => setShowNominateForm(false)}
                    className={styles.cancelBtn}
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
