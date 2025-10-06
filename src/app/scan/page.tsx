'use client';

import Link from 'next/link';
import ScanISBN from '@/components/ScanISBN';

export default function ScanPage() {
  return (
    <main
      style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#0f172a', // dark background to match Discover
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--accent-color, #fff)',
            margin: 0,
          }}
        >
          Scan ISBN
        </h1>

        <Link
          href="/discover"
          style={{
            background: '#fff',
            color: '#111',
            textDecoration: 'none',
            padding: '0.5rem 0.9rem',
            borderRadius: '6px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f3f3')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
        >
          ← Back to Discover
        </Link>
      </div>

      {/* Description */}
      <p
        style={{
          marginTop: '0.5rem',
          color: '#ccc',
          fontSize: '0.95rem',
        }}
      >
        Align the barcode inside the frame or type the ISBN manually below.
      </p>

      {/* Scanner Panel */}
      <div
        style={{
          margin: '2rem auto',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 0 10px rgba(0,0,0,0.3)',
          maxWidth: '480px',
        }}
      >
        <ScanISBN />
      </div>
    </main>
  );
}
