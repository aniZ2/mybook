'use client';

export const dynamic = "force-dynamic";

import { useState } from "react";
import { signInWithEmail, startGoogleRedirect } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatError } from "@/lib/errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading } = useAuth();

  if (!loading && user) router.push("/account");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmail(email, password);
      router.push("/account");
    } catch (err: unknown) {
      setError(formatError(err));
    }
  }

  async function handleGoogle() {
    try {
      await startGoogleRedirect();
    } catch (err: unknown) {
      setError(formatError(err));
    }
  }

  return (
    <main className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue your journey 📚</p>

        <form onSubmit={handleLogin}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button className="btn-primary btn" type="submit">
            Sign In
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button type="button" className="btn-google" onClick={handleGoogle}>
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="google-icon"
            />
            Continue with Google
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="login-footer">
          Don’t have an account?{" "}
          <a href="/signup" className="link">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
