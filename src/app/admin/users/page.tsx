'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // ✅ Import useAuth

type UserRow = { 
  uid: string; 
  email?: string; 
  displayName?: string; 
  disabled: boolean; 
  admin: boolean; 
  stripeCustomerId?: string | null 
};

export default function AdminUsers(){
  const { user } = useAuth(); // ✅ Get user from context
  const [rows, setRows] = useState<UserRow[]>([]);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (token?: string | null) => {
    if (!user) { // ✅ Use user from context
      alert('Sign in'); 
      return; 
    }

    setBusy(true);
    try {
      const idToken = await user.getIdToken(true); // ✅ Use user from context
      const qs = new URLSearchParams(); 
      if (token) qs.set('pageToken', token);
      
      const r = await fetch('/api/admin/users/list?' + qs.toString(), { 
        headers: { authorization: 'Bearer ' + idToken } 
      });
      const j = await r.json();
      
      if (!r.ok) { 
        alert('Error: ' + (j.error || 'unknown')); 
        return; 
      }
      
      setRows(j.users || []); 
      setPageToken(j.nextPageToken || null);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { 
    if (user) { // ✅ Only load if user exists
      load(null); 
    }
  }, [user]); // ✅ Add user to dependencies

  const toggleAdmin = async (uid: string, newVal: boolean) => {
    const key = prompt('Enter ADMIN_API_KEY to confirm:');
    if (!key) return;
    
    const r = await fetch('/api/admin/set-claim', {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        'x-admin-key': key 
      },
      body: JSON.stringify({ uid, admin: newVal })
    });
    
    if (!r.ok) { 
      const j = await r.json().catch(() => ({})); 
      alert('Error: ' + (j.error || r.statusText)); 
      return; 
    }
    
    alert('Updated admin claim. User must re-login to take effect.');
    load(null);
  };

  return (
    <div className="panel">
      <h2>Admin • Users</h2>
      <div className="muted">Toggle admin claim, view Stripe status.</div>
      <div style={{ overflow: 'auto', marginTop: '.6rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #1e2230' }}>Email</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #1e2230' }}>UID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #1e2230' }}>Admin</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #1e2230' }}>Stripe</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #1e2230' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.uid} style={{ borderBottom: '1px solid #1e2230' }}>
                <td>{u.email || '—'}</td>
                <td style={{ fontFamily: 'monospace' }}>{u.uid}</td>
                <td>{u.admin ? '✅' : '—'}</td>
                <td style={{ fontFamily: 'monospace' }}>{u.stripeCustomerId || '—'}</td>
                <td>
                  <button 
                    className="btn" 
                    onClick={() => toggleAdmin(u.uid, !u.admin)}
                  >
                    {u.admin ? 'Remove admin' : 'Make admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '.6rem', display: 'flex', gap: '.6rem' }}>
        <button 
          className="btn" 
          disabled={!pageToken || busy} 
          onClick={() => load(pageToken!)}
        >
          Next Page
        </button>
        <button 
          className="btn" 
          onClick={() => load(null)} 
          disabled={busy}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}