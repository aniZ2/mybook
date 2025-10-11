'use client';

import { useState, useEffect } from "react";
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  logout as firebaseSignOut,
  needsOnboarding 
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatError } from "@/lib/errors";

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();
  const { user, loading } = useAuth();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);
    
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        router.push("/onboarding");
      } else {
        await signInWithEmail(email, password);
        const needs = await needsOnboarding(user?.uid || '');
        router.push(needs ? "/onboarding" : "/account");
      }
    } catch (err) {
      setError(formatError(err));
      setIsProcessing(false);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setIsProcessing(true);
    
    try {
      const u = await signInWithGoogle();
      const needs = await needsOnboarding(u.uid);
      router.push(needs ? "/onboarding" : "/account");
    } catch (err) {
      setError(formatError(err));
      setIsProcessing(false);
    }
  }

  async function handleSignOut() {
    try {
      await firebaseSignOut();
      router.push("/");
    } catch (err) {
      setError(formatError(err));
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: '#94a3b8' }}>Loading...</p>
        </div>
      </main>
    );
  }

  // Already logged in - show account info
  if (user) {
    return (
      <main style={styles.page}>
        <div style={styles.blob1}></div>
        <div style={styles.blob2}></div>

        <div style={styles.container}>
          <div style={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  style={styles.avatar}
                />
              )}
              <h1 style={styles.title}>Welcome Back!</h1>
              <p style={styles.subtitle}>{user.displayName || user.email}</p>
            </div>

            <button 
              style={styles.accountBtn}
              onClick={() => router.push('/account')}
            >
              Go to Account
            </button>

            <button 
              style={styles.logoutBtn}
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Not logged in - show login/signup
  return (
    <main style={styles.page}>
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

      <div style={styles.container}>
        <div style={styles.card}>
          {/* Tab switcher */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(mode === 'login' ? styles.tabActive : {}),
              }}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Sign In
            </button>
            <button
              style={{
                ...styles.tab,
                ...(mode === 'signup' ? styles.tabActive : {}),
              }}
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
            >
              Sign Up
            </button>
          </div>

          <h1 style={styles.title}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={styles.subtitle}>
            {mode === 'login' 
              ? 'Sign in to continue to Booklyverse' 
              : 'Join Booklyverse and connect with readers'}
          </p>

          <form onSubmit={handleEmailSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isProcessing}
            />
            <input
              style={styles.input}
              type="password"
              placeholder={mode === 'signup' ? 'Password (min 6 characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 6 : undefined}
              disabled={isProcessing}
            />

            <button style={styles.submitBtn} type="submit" disabled={isProcessing}>
              {isProcessing 
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...') 
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.dividerLine}></span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>or</span>
            <span style={styles.dividerLine}></span>
          </div>

          <button 
            type="button" 
            style={styles.googleBtn}
            onClick={handleGoogleAuth}
            disabled={isProcessing}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M19.8 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.5c-.2 1.2-1 2.2-2.1 2.9v2.5h3.4c2-1.8 3-4.5 3-7.2z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 5-1 6.6-2.6l-3.4-2.5c-1 .6-2.2 1-3.2 1-2.4 0-4.5-1.6-5.2-3.9H1.3v2.6C2.9 17.7 6.2 20 10 20z" fill="#34A853"/>
              <path d="M4.8 11.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V5.5H1.3C.5 7.1 0 8.5 0 10s.5 2.9 1.3 4.5l3.5-2.6z" fill="#FBBC05"/>
              <path d="M10 4c1.4 0 2.6.5 3.6 1.4l2.7-2.7C14.5 1.1 12.3 0 10 0 6.2 0 2.9 2.3 1.3 5.5l3.5 2.6C5.5 5.6 7.6 4 10 4z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '2rem', position: 'relative' as const, overflow: 'hidden' },
  blob1: { position: 'absolute' as const, top: '-10%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 },
  blob2: { position: 'absolute' as const, bottom: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 },
  container: { position: 'relative' as const, zIndex: 1, width: '100%', maxWidth: '420px' },
  card: { background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', padding: '3rem', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem', borderRadius: '12px' },
  tab: { flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderRadius: '10px', color: '#94a3b8', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer', transition: 'all 0.2s ease' },
  tabActive: { background: 'linear-gradient(135deg,hsl(204, 76.40%, 48.20%) 0%,hsl(204, 76.40%, 48.20%) 100%)', color: '#fff' },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem 0', textAlign: 'center' as const },
  subtitle: { color: '#94a3b8', textAlign: 'center' as const, margin: '0 0 2rem 0', fontSize: '0.9375rem' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem', marginBottom: '1.5rem' },
  input: { width: '100%', padding: '0.875rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '0.9375rem', transition: 'all 0.2s ease' },
  submitBtn: { width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, hsl(204, 76.40%, 48.20%) 0%, hsl(204, 76.40%, 48.20%) 100%)', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' },
  divider: { display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' },
  dividerLine: { flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)', display: 'block' },
  googleBtn: { width: '100%', padding: '0.875rem', background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1rem', border: '3px solid rgba(99, 102, 241, 0.5)' },
  accountBtn: { width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' },
  logoutBtn: { width: '100%', padding: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', cursor: 'pointer' },
  error: { padding: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' as const },
};