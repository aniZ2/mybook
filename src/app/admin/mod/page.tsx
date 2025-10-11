'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Adjust path to your AuthProvider

type Report = {
  id: string;
  reason?: string;
  path?: string;
  uid?: string;
  createdAt?: any;
  resolved?: boolean;
};

export default function AdminMod() {
  const { user } = useAuth(); // ✅ Get user from context
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) {
      setError('Sign in first.');
      return;
    }

    try {
      setLoading(true);
      const tok = await user.getIdToken(true);
      const r = await fetch('/api/mod/queue', {
        headers: { authorization: 'Bearer ' + tok },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unknown error');
      setItems(j.items || []);
      setError(null); // Clear any previous errors
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const act = async (action: string, report: Report) => {
    if (!user) return alert('Sign in first.');

    try {
      const tok = await user.getIdToken(true);
      const body = {
        action,
        target: {
          reportId: report.id,
          path: report.path,
          uid: report.uid,
        },
      };

      const r = await fetch('/api/mod/act', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + tok,
        },
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unknown error');
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Action failed.');
    }
  };

  return (
    <div className="panel" style={{ padding: '1.25rem' }}>
      <h2>Admin • Moderation Queue</h2>
      <div className="muted" style={{ marginBottom: '.6rem' }}>
        Review reports and take action.
      </div>

      {loading && <p className="muted">Loading reports...</p>}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '.75rem',
            borderRadius: '4px',
            marginBottom: '.6rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="muted">No reports found 🎉</p>
      )}

      {items.map((r) => (
        <div
          key={r.id}
          className="panel"
          style={{
            marginBottom: '.6rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '1rem',
            background: '#fafafa',
          }}
        >
          <div>
            <strong>{r.reason || 'Report'}</strong>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            path: {r.path || '—'} • user: {r.uid || '—'}
          </div>
          <div style={{ display: 'flex', gap: '.6rem', marginTop: '.4rem' }}>
            <button
              className="btn"
              onClick={() => act('hide_post', r)}
              disabled={r.resolved}
            >
              Hide
            </button>
            <button
              className="btn"
              onClick={() => act('delete_post', r)}
              disabled={r.resolved}
            >
              Delete
            </button>
            {r.uid && (
              <button
                className="btn"
                onClick={() => act('ban_user', r)}
                disabled={r.resolved}
              >
                Ban user
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}