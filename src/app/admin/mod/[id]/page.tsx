'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Adjust path if needed
import Link from 'next/link';

export default function ModDetail({ params }: { params: { id: string } }) {
  const { id } = params as any;
  const { user } = useAuth(); // ✅ Use auth context instead of direct auth
  const [item, setItem] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError('Please sign in first.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tok = await user.getIdToken(true);
        
        // Fetch moderation queue
        const r = await fetch('/api/mod/queue', {
          headers: { authorization: 'Bearer ' + tok }
        });
        const j = await r.json();
        
        if (!r.ok) {
          throw new Error(j.error || 'Failed to fetch moderation queue');
        }
        
        const it = (j.items || []).find((x: any) => x.id === id);
        setItem(it || null);

        // Fetch raw document if path exists
        if (it?.path) {
          const rr = await fetch('/api/util/doc?path=' + encodeURIComponent(it.path), {
            headers: { authorization: 'Bearer ' + tok }
          });
          const jj = await rr.json();
          
          if (!rr.ok) {
            console.error('Failed to fetch document:', jj.error);
          } else {
            setContent(jj.doc || null);
          }
        }
        
        setError(null);
      } catch (e: any) {
        console.error('Error fetching moderation details:', e);
        setError(e.message || 'Failed to load moderation details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  if (loading) {
    return <div className="panel">Loading…</div>;
  }

  if (error) {
    return (
      <div className="panel">
        <div style={{
          background: '#fee2e2',
          color: '#b91c1c',
          padding: '.75rem',
          borderRadius: '4px',
          marginBottom: '.6rem'
        }}>
          {error}
        </div>
        <Link className="btn" href="/admin/mod">Back to queue</Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="panel">
        <div className="muted">Report not found</div>
        <div style={{ marginTop: '.6rem' }}>
          <Link className="btn" href="/admin/mod">Back to queue</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Moderation • {id}</h2>
      <div className="muted">Reason: {item.reason}</div>
      <div className="muted">Path: {item.path || '—'}</div>
      
      {item.snapshot && (
        <details>
          <summary>Snapshot (reported)</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(item.snapshot, null, 2)}
          </pre>
        </details>
      )}
      
      {content && (
        <details open>
          <summary>Current content</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(content, null, 2)}
          </pre>
        </details>
      )}
      
      {!!(item.evidenceUrls || []).length && (
        <div style={{ marginTop: '.6rem' }}>
          <div className="muted">Evidence:</div>
          <ul>
            {item.evidenceUrls.map((u: string, i: number) => (
              <li key={i}>
                <a className="link" href={u} target="_blank" rel="noopener noreferrer">
                  Attachment {i + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ marginTop: '.6rem' }}>
        <Link className="btn" href="/admin/mod">Back to queue</Link>
      </div>
    </div>
  );
}