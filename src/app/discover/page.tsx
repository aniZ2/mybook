// app/discover/page.tsx
'use client';

import React from 'react';
import DiscoverPage from './DiscoverPage';
import { useAuth } from '@/hooks/useAuth';

/**
 * Auth-aware wrapper — keeps DiscoverPage reusable
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
