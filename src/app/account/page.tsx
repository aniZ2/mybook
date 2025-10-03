'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'account' | 'feeds' | 'apps'>('account');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) return <p className="muted">Loading account…</p>;
  if (!user) return null;

  return (
    <main className="container account-container">
      <div className="panel account-card">
        <h1 className="h1">Account Settings</h1>

        {/* Tabs */}
        <nav className="account-tabs">
          {['account', 'feeds', 'apps'].map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t as typeof tab)}
            >
              {t === 'account' && 'Account & Notifications'}
              {t === 'feeds' && 'Feeds'}
              {t === 'apps' && 'Apps'}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {tab === 'account' && (
          <section>
            <h2 className="h2">Account Settings</h2>
            <p className="muted">Update your email, password, and notifications.</p>
            <div className="form-grid">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" defaultValue={user.email || ''} />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="••••••" />
              </div>
              <button className="btn-primary btn">Update Account</button>
            </div>
          </section>
        )}

        {tab === 'feeds' && (
          <section>
            <h2 className="h2">Feed Preferences</h2>
            <p className="muted">Choose which updates appear in your activity feed.</p>
            <div className="prefs-grid">
              <label><input type="checkbox" /> Show book reviews</label>
              <label><input type="checkbox" /> Show new club activity</label>
              <label><input type="checkbox" /> Show author posts</label>
            </div>
          </section>
        )}

        {tab === 'apps' && (
          <section>
            <h2 className="h2">Connected Apps</h2>
            <p className="muted">Manage apps linked to your account.</p>
            <div className="prefs-grid">
              <p className="muted">No third-party apps connected.</p>
              <button className="btn">Connect App</button>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="danger-zone">
          <h2 className="h2">Danger Zone</h2>
          {error && <p style={{ color: 'tomato' }}>{error}</p>}
          <button> 
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </section>
      </div>
    </main>
  );
}
