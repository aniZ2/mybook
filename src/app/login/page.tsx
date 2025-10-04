// src/app/login/page.tsx
'use client';

import { useState, useEffect } from "react";
import { signInWithEmail, signInWithGoogle, needsOnboarding } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatError } from "@/lib/errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (loading || !user) return;

    (async () => {
      const needs = await needsOnboarding(user.uid);
      router.push(needs ? "/onboarding" : "/account");
    })();
  }, [user, loading, router]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);
    
    try {
      const u = await signInWithEmail(email, password);
      const needs = await needsOnboarding(u.uid);
      router.push(needs ? "/onboarding" : "/account");
    } catch (err) {
      setError(formatError(err));
      setIsProcessing(false);
    }
  }

  async function handleGoogleLogin() {
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

  if (loading) {
    return (
      <main className="login-container">
        <div className="login-card">
          <p className="muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-container">
      <div className="book-glow"></div>
      <div className="login-card">
        <h1 className="login-title">Sign In</h1>
        <p className="login-subtitle">Welcome back to Booklyverse</p>

        <form onSubmit={handleEmailLogin}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isProcessing}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isProcessing}
          />

          <button className="btn-primary btn" type="submit" disabled={isProcessing}>
            {isProcessing ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="divider">or</div>

        <button 
          type="button" 
          className="btn btn-google" 
          onClick={handleGoogleLogin}
          disabled={isProcessing}
        >
          Continue with Google
        </button>

        {error && <p className="error-text">{error}</p>}

        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
          Don't have an account?{" "}
          <a href="/signup" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}