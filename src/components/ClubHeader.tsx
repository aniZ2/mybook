'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Heart,
  Users,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './Club.module.css';

interface Club {
  slug: string;
  name: string;
  description?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
  iconUrl?: string;
  bannerUrl?: string;
  memberIds?: string[];
  ownerUid?: string;
  createdAt?: string;
}

interface ClubHeaderProps {
  club: Club;
  currentUserId?: string;
  onJoinSuccess?: (newMemberCount: number) => void;
}

export default function ClubHeader({
  club,
  currentUserId,
  onJoinSuccess,
}: ClubHeaderProps) {
  const router = useRouter();

  const [isMember, setIsMember] = useState(
    club.memberIds?.includes(currentUserId || '') ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(club.membersCount || 0);
  const [booksCount, setBooksCount] = useState(club.booksCount || 0);
  const [startingVote, setStartingVote] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isAdmin = club.ownerUid === currentUserId;

  /* ─────────────── Format Helpers ─────────────── */
  const formatCount = (count: number) =>
    count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count.toString();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  /* ─────────────── Books Count = Current + Past ─────────────── */
  const fetchBooksCount = useCallback(async () => {
    try {
      const db = getDbOrThrow();
      const booksRef = collection(db, 'clubs', club.slug, 'books');

      const [currentSnap, pastSnap] = await Promise.all([
        getDocs(query(booksRef, where('status', '==', 'currently_reading'))),
        getDocs(query(booksRef, where('status', '==', 'past_read'))),
      ]);

      const total = currentSnap.size + pastSnap.size;
      setBooksCount(total);
    } catch (err) {
      console.error('Error fetching club books:', err);
    }
  }, [club.slug]);

  useEffect(() => {
    fetchBooksCount();
  }, [fetchBooksCount]);

  /* ─────────────── JOIN ─────────────── */
  const handleJoinClub = async () => {
    if (!currentUserId) {
      toast.error('📚 Please log in to join this club.');
      return;
    }

    if (isMember) {
      toast('💬 You’re already a member.', { duration: 2500 });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsMember(true);
        const newCount = memberCount + 1;
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
        toast.success(`✨ Welcome to ${club.name}!`, {
          icon: '📖',
          duration: 3500,
        });
      } else {
        toast.error(data.error || 'Could not join the club.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while joining.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ─────────────── Custom Confirm Leave ─────────────── */
  const confirmLeave = () => {
    if (leaving) return;

    toast.custom((t) => (
      <div
        className={`relative bg-[rgba(30,27,75,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.15)] text-white px-5 py-4 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] w-[320px] transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <p className="font-medium mb-2 text-center text-[15px]">
          Leave <span className="text-purple-300">{club.name}</span>?
        </p>

        <div className="flex justify-center gap-3 mt-3">
          <button
            className="px-4 py-1.5 rounded-md bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] text-sm text-gray-200 transition"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1.5 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-sm font-semibold transition"
            onClick={() => {
              toast.dismiss(t.id);
              handleLeaveConfirmed();
            }}
          >
            Leave
          </button>
        </div>
      </div>
    ));
  };

  /* ─────────────── Leave Logic ─────────────── */
  const handleLeaveConfirmed = async () => {
    if (!currentUserId) return;
    setLeaving(true);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/clubs/${club.slug}/join`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsMember(false);
        const newCount = Math.max(0, memberCount - 1);
        setMemberCount(newCount);
        onJoinSuccess?.(newCount);
        toast('👋 You left the club.', { icon: '💔', duration: 3000 });
      } else toast.error(data.error || 'Failed to leave club.');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong while leaving.');
    } finally {
      setLeaving(false);
      setIsLoading(false);
    }
  };

  /* ─────────────── Start Voting ─────────────── */
  const handleStartVoting = async () => {
    if (!isAdmin) {
      toast('🗳️ Only the admin can start voting.');
      return;
    }

    if (startingVote) {
      toast('⏳ A voting session is already starting...');
      return;
    }

    toast.loading('Starting voting round...');
    setStartingVote(true);
    try {
      const res = await fetch(`/api/clubs/${club.slug}/votes/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      toast.dismiss();
      if (res.ok)
        toast.success('🗳️ Voting round started!', { icon: '🌟' });
      else toast.error('Failed to start voting.');
    } catch (err) {
      console.error('Error starting voting:', err);
      toast.error('Something went wrong.');
    } finally {
      setStartingVote(false);
    }
  };

  /* ─────────────── UI ─────────────── */
  return (
    <div className={styles.literaryLoungeHeader}>
      <div className={styles.ambientBackground}>
        <div className={`${styles.blurOrb} ${styles.orb1}`} />
        <div className={`${styles.blurOrb} ${styles.orb2}`} />
      </div>

      <div className={styles.frostedContainer}>
        <div className={styles.headerContent}>
          <div className={styles.clubIdentity}>
            {/* Club Icon */}
            <div className={styles.clubIconWrapper}>
              {club.iconUrl ? (
                <img
                  src={club.iconUrl}
                  alt={club.name}
                  className={styles.clubIconImg}
                />
              ) : (
                <div className={styles.clubIconDefault}>
                  <Heart className={styles.iconHeart} />
                </div>
              )}

              {/* Admin-only nominate button */}
              {isAdmin && (
                <button
                  className={styles.iconNominateButton}
                  onClick={() =>
                    router.push(`/books?selectForNomination=${club.slug}`)
                  }
                  title="Pick a book from your library to nominate"
                >
                  <Sparkles size={14} /> Nominate Book
                </button>
              )}
            </div>

            {/* Club Info */}
            <div className={styles.clubInfo}>
              <div className={styles.clubTitleRow}>
                <h1 className={styles.clubName}>{club.name}</h1>

                {/* Member + Start Voting Buttons */}
                <div className={styles.actionButtons}>
                  {isMember ? (
                    <div
                      className={styles.memberBadge}
                      onClick={confirmLeave}
                    >
                      <CheckCircle2 className={styles.memberIcon} />
                      {isLoading ? '...' : 'Member'}
                    </div>
                  ) : (
                    <button
                      className={styles.joinButton}
                      onClick={handleJoinClub}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2
                          className={styles.joinIcon}
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                      ) : (
                        <Heart className={styles.joinIcon} />
                      )}
                      Join
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      className={styles.startVotingButton}
                      onClick={handleStartVoting}
                      disabled={startingVote}
                    >
                      <Sparkles size={14} />
                      {startingVote ? 'Starting...' : 'Start Voting'}
                    </button>
                  )}
                </div>
              </div>

              {club.description && (
                <p className={styles.clubTagline}>{club.description}</p>
              )}

              <div className={styles.clubMeta}>
                <span>
                  <Users size={14} /> {formatCount(memberCount)} members
                </span>
                <span>•</span>
                <span>
                  <BookOpen size={14} /> {formatCount(booksCount)} books
                </span>
                <span>•</span>
                <span>
                  <Calendar size={14} /> {formatDate(club.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
