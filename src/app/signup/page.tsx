'use client';

export const dynamic = "force-dynamic";

import { useState } from "react";
import { signUpWithEmail, startGoogleRedirect } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatError } from "@/lib/errors";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading } = useAuth();

  // Auto-redirect if logged in
  if (!loading && user) {
    router.push("/account");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signUpWithEmail(email, password);
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
    <main className="login-container fade-in">
      <div className="book-glow"></div>
      <div className="signup-glow"></div>

      <div className="signup-card">
        <h1 className="login-title signup-title">
          Join <span>Booklyverse</span>
        </h1>
        <p className="login-subtitle">Your next story begins here.</p>

        <form onSubmit={handleSignup}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-primary" type="submit">
            Create Account
          </button>

          <div className="divider">or</div>

          <button type="button" className="btn btn-google" onClick={handleGoogle}>
            <img
              className="google-icon"
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
            />
            Continue with Google
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <p className="login-footer">
          Already have an account?{" "}
          <a
            onClick={() => {
              document.body.classList.add("page-flip");
              setTimeout(() => router.push("/login"), 400);
            }}
            className="link"
          >
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
