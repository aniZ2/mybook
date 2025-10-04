'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

interface AuditRow {
  id: string;
  at?: { _seconds?: number };
  uid?: string;
  kind?: string;
  note?: string;
  rows?: any[];        // changed to any[] instead of unknown[]
  context?: Record<string, any> | null;
}

function toCSV(rows: AuditRow[]): string {
  const headers = ['id', 'at', 'uid', 'kind', 'note'];
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.at && r.at._seconds
          ? new Date(r.at._seconds * 1000).toISOString()
          : '',
        r.uid || '',
        r.kind || '',
        r.note || '',
      ].map(esc).join(',')
    );
  }
  return lines.join('\n');
}

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [kind, setKind] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const u = auth.currentUser;
      if (!u) {
        setError('Sign in first.');
        return;
      }

      const tok = await u.getIdToken(true);
      const qs = new URLSearchParams();
      if (kind) qs.set('kind', kind);
      if (since) qs.set('since', since);
      if (until) qs.set('until', until);

      const r = await fetch('/api/imports/audit/list?' + qs.toString(), {
        headers: { authorization: 'Bearer ' + tok },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unknown error');

      setRows(j.rows || []);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [kind, since, until]);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setSince(d.toISOString().slice(0, 16));
    fetchRows();
  }, [fetchRows]);

  const downloadCSV = () => {
    if (!rows.length) return;
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin_audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Admin • Audit Logs</h2>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.6rem',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          style={{
            padding: '.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <option value="">(all kinds)</option>
          <option value="dry_run">dry_run</option>
          <option value="write_books">write_books</option>
        </select>

        <input
          type="datetime-local"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          style={{
            padding: '.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <input
          type="datetime-local"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          style={{
            padding: '.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />

        <button
          onClick={fetchRows}
          style={{
            padding: '.6rem 1rem',
            background: '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Search
        </button>

        <button
          onClick={downloadCSV}
          disabled={!rows.length}
          style={{
            padding: '.6rem 1rem',
            background: rows.length ? '#facc15' : '#e5e7eb',
            color: rows.length ? 'black' : '#888',
            border: 'none',
            borderRadius: '4px',
            cursor: rows.length ? 'pointer' : 'not-allowed',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Errors / Loading */}
      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Loading logs…</p>
      )}

      {!loading && rows.length === 0 && !error && (
        <p style={{ color: '#666' }}>No logs found.</p>
      )}

      {/* Results */}
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '.75rem',
            background: '#fafafa',
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {r.kind || 'unknown'} —{' '}
            <span style={{ color: '#555' }}>{r.uid || 'anon'}</span>
          </div>
          <div style={{ fontSize: '.85rem', color: '#666' }}>
            {r.at && r.at._seconds
              ? new Date(r.at._seconds * 1000).toLocaleString()
              : ''}
          </div>

          {r.note && (
            <p style={{ marginTop: '.4rem', color: '#444', fontSize: '.9rem' }}>
              {r.note}
            </p>
          )}

          {r.rows && (
            <details style={{ marginTop: '.5rem' }}>
              <summary style={{ cursor: 'pointer' }}>
                {(r.rows || []).length} rows
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#f1f5f9',
                  padding: '.5rem',
                  borderRadius: '4px',
                  marginTop: '.3rem',
                }}
              >
                {String(JSON.stringify(r.rows, null, 2))}
              </pre>
            </details>
          )}

          {r.context && (
            <details style={{ marginTop: '.5rem' }}>
              <summary style={{ cursor: 'pointer' }}>Context</summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#f1f5f9',
                  padding: '.5rem',
                  borderRadius: '4px',
                  marginTop: '.3rem',
                }}
              >
                {String(JSON.stringify(r.context, null, 2))}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
