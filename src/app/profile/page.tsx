'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Image from 'next/image';
import { useState } from 'react';

export default function ProfilePage() {
  const [tab, setTab] = useState<'about' | 'activity' | 'friends'>('about');

  return (
    <ProtectedRoute>
      {(user) => {
        const displayName = user.displayName || user.email || 'Anonymous Reader';
        const photoURL = user.photoURL || '/default-avatar.png';

        return (
          <main>
            {/* Cover Photo */}
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
                    border: '4px solid var(--bg-gradient, #1f2937)',
                    background: '#111',
                  }}
                >
                  <Image src={photoURL} alt="Profile picture" width={120} height={120} />
                </div>

                {/* Name + Buttons */}
                <div>
                  <h1 className="h1" style={{ marginBottom: '.25rem' }}>
                    {displayName}
                  </h1>
                  <p className="muted">📚 Avid Reader · Club Member</p>
                  <div style={{ marginTop: '.5rem', display: 'flex', gap: '.5rem' }}>
                    <button className="btn">Edit Profile</button>
                    <button className="btn-primary btn">Message</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                marginTop: '80px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '2rem',
                padding: '0 2rem',
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
                    borderBottom: tab === t ? '3px solid var(--accent)' : 'none',
                    fontWeight: tab === t ? 600 : 400,
                    cursor: 'pointer',
                    color: 'var(--fg)',
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="container" style={{ marginTop: '2rem' }}>
              {tab === 'about' && (
                <div className="panel">
                  <h2 className="h2">About</h2>
                  <p className="muted">
                    This is where you can show your bio, favorite genres, and clubs you belong to.
                  </p>
                </div>
              )}

              {tab === 'activity' && (
                <div className="panel">
                  <h2 className="h2">Recent Activity</h2>
                  <ul style={{ margin: 0, padding: '0 1rem' }}>
                    <li>📖 Finished *The Night Circus*</li>
                    <li>💬 Commented in *Fantasy Lovers Club*</li>
                    <li>👍 Liked a post in *Historical Reads*</li>
                  </ul>
                </div>
              )}

              {tab === 'friends' && (
                <div className="panel">
                  <h2 className="h2">Friends</h2>
                  <div className="grid" style={{ gap: '1rem', marginTop: '1rem' }}>
                    <div className="col-4 panel">Friend 1</div>
                    <div className="col-4 panel">Friend 2</div>
                    <div className="col-4 panel">Friend 3</div>
                  </div>
                </div>
              )}
            </div>
          </main>
        );
      }}
    </ProtectedRoute>
  );
}
