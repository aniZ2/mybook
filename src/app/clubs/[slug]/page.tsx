'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ClubChat from '@/components/ClubChat';

export default function ClubPage({ params }: { params: { slug: string } }) {
  const { slug } = params; // ✅ no use(), no Promise unwrap

  
  const [clubData, setClubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 Fetching club:', slug); // Debug log
        const res = await fetch(`/api/clubs/${slug}`);
        console.log('📡 Response status:', res.status); // Debug log
        
        if (!res.ok) {
          console.error('❌ API returned error:', res.status);
          setClubData(null);
          return;
        }
        
        const data = await res.json();
        console.log('✅ Club data received:', data); // Debug log
        setClubData(data);
      } catch (err) {
        console.error('Failed to fetch club:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // 🧱 1️⃣ Loading state
  if (loading) {
    return (
      <main style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Loading club details...</h2>
      </main>
    );
  }

  // 🧱 2️⃣ Fallback if not found or invalid response
  if (!clubData?.club) {
    return (
      <main style={{ textAlign: 'center', padding: '4rem' }}>
        <h1>Club Not Found</h1>
        <p style={{ color: '#9ca3af' }}>Try again later.</p>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Check the browser console for error details.
        </p>
      </main>
    );
  }

  const { club, books = [], members = [] } = clubData;

  return (
    <main style={{ overflowX: 'hidden' }}>
      {/* Header */}
      <header
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Image
            src={club.iconUrl || '/placeholder.png'}
            alt={club.name}
            width={80}
            height={80}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <h1>{club.name}</h1>
            <p style={{ color: '#9ca3af' }}>{club.description}</p>
            <div style={{ marginTop: '0.5rem' }}>
              👥 {club.membersCount || members.length} members — 📚{' '}
              {club.booksCount || books.length} books
            </div>
          </div>
        </div>
      </header>

      {/* Books */}
      <section style={{ padding: '1rem', marginBottom: '3rem' }}>
        <h2>Books</h2>
        {books.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No books yet</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem',
            }}
          >
            {books.map((book: any) => (
              <Link key={book.slug} href={`/books/${book.slug}`}>
                <div>
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      width={120}
                      height={180}
                      style={{ borderRadius: '6px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '120px',
                        height: '180px',
                        background: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                      }}
                    >
                      {book.title}
                    </div>
                  )}
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{book.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section style={{ padding: '1rem', marginBottom: '3rem' }}>
        <h2>Members</h2>
        {members.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No members yet</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '1rem',
            }}
          >
            {members.map((m: any) => (
              <div
                key={m.userId}
                style={{
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '1rem',
                  borderRadius: '8px',
                }}
              >
                <Image
                  src={m.userPhoto || '/avatar.png'}
                  alt={m.userName}
                  width={60}
                  height={60}
                  style={{ borderRadius: '50%' }}
                />
                <p style={{ marginTop: '0.5rem', fontWeight: 500 }}>{m.userName}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Chat */}
      <section style={{ padding: '1rem 1rem 4rem' }}>
        <h2>Chat</h2>
        <ClubChat slug={club.slug} />
      </section>
    </main>
  );
}