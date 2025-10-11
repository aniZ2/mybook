'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // ✅ Get user from context

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'about' | 'activity' | 'friends'>('about');

  // ──────────── Loading State ────────────
  if (loading) {
    return (
      <main
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#555',
        }}
      >
        <p style={{ fontSize: '1.2rem' }}>Loading...</p>
      </main>
    );
  }

  // ──────────── Sign-in Prompt ────────────
  if (!user) {
    return (
      <main
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#555',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <p style={{ fontSize: '1.2rem' }}>You're not signed in.</p>

        <Link
          href="/login"
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '.75rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Sign In
        </Link>
      </main>
    );
  }

  // ──────────── Profile Info ────────────
  const displayName = user.displayName || user.email || 'Anonymous Reader';
  const photoURL = user.photoURL || '/default-avatar.png';

  return (
    <main>
      {/* ───── Cover Photo + Header ───── */}
      <div
        style={{
          position: 'relative',
          height: '260px',
          background:
            'url(/default-cover.jpg) center/cover no-repeat, linear-gradient(to right, #374151, #111827)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '2rem',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1rem',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid #1f2937',
              background: '#111',
            }}
          >
            <Image src={photoURL} alt="Profile picture" width={120} height={120} />
          </div>

          {/* Name + Buttons */}
          <div>
            <h1
              style={{
                marginBottom: '.25rem',
                fontSize: '1.8rem',
                color: '#fff',
              }}
            >
              {displayName}
            </h1>
            <p style={{ color: '#ddd' }}>📚 Avid Reader · Club Member</p>
            <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem' }}>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #fff',
                  color: '#fff',
                  padding: '.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Edit Profile
              </button>
              <button
                style={{
                  background: '#facc15',
                  color: '#000',
                  padding: '.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Tabs ───── */}
      <div
        style={{
          marginTop: '80px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '2rem',
          padding: '0 2rem',
          background: '#0f172a',
          color: 'white',
        }}
      >
        {['about', 'activity', 'friends'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '1rem 0',
              borderBottom: tab === t ? '3px solid #facc15' : 'none',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              color: 'white',
              fontSize: '1rem',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ───── Tab Content ───── */}
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
        {tab === 'about' && (
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ marginBottom: '.5rem' }}>About</h2>
            <p style={{ color: '#555' }}>
              This is where you can show your bio, favorite genres, and clubs you belong to.
            </p>
          </div>
        )}

        {tab === 'activity' && (
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ marginBottom: '.5rem' }}>Recent Activity</h2>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#555' }}>
              <li>📖 Finished *The Night Circus*</li>
              <li>💬 Commented in *Fantasy Lovers Club*</li>
              <li>👍 Liked a post in *Historical Reads*</li>
            </ul>
          </div>
        )}

        {tab === 'friends' && (
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ marginBottom: '1rem' }}>Friends</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                Friend 1
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                Friend 2
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px' }}>
                Friend 3
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
