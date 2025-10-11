'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider'; // ✅ Import useAuth

export default function AdminSearch() {
  const { user } = useAuth(); // ✅ Get user from context
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!user) return alert('Please sign in first.'); // ✅ Use user from context

    if (!functions) {
      return alert('Firebase Functions not initialized.');
    }

    setLoading(true);
    try {
      const call = httpsCallable(functions, 'buildEmbeddingsNow');
      await call({ limit });
      alert('✅ Triggered embeddings build successfully!');
    } catch (e: any) {
      console.error(e);
      alert('❌ Error: ' + (e.message || 'Failed to trigger function.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <h2 style={{ marginBottom: '.5rem' }}>Admin • Search / Embeddings</h2>
      <p style={{ color: '#555', marginBottom: '1rem' }}>
        Build embeddings for books to power Booklyverse's vibe search.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="number"
          value={limit}
          min={1}
          max={1000}
          onChange={(e) => setLimit(parseInt(e.target.value || '0', 10) || 0)}
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '1rem',
          }}
        />

        <button
          onClick={run}
          disabled={loading}
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '0.6rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: '0.2s ease',
          }}
        >
          {loading ? 'Building…' : 'Build Now'}
        </button>
      </div>
    </div>
  );
}