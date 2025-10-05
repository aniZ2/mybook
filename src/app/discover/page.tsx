// app/discover/page.tsx
'use client';

import React from 'react';
import DiscoverPage from './DiscoverPage';
import { useAuth } from '@/hooks/useAuth';

/**
 * This lightweight wrapper makes the page "auth-aware"
 * and passes the current user's UID down to DiscoverPage.
 *
 * - Keeps DiscoverPage as a reusable component
 * - Avoids Next.js "invalid page prop" warnings
 * - Ensures everything runs in the client for Firestore access
 */

export default function DiscoverPageWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading your Booklyverse feed...</p>
      </div>
    );
  }

  return <DiscoverPage user={user ? { uid: user.uid } : undefined} />;
}
