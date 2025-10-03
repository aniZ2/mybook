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
    <main className="container">
      <h1 className="h1">Create Account</h1>
      <form onSubmit={handleSignup} className="panel" style={{ maxWidth: 400 }}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn-primary btn" type="submit">Sign Up</button>
        <button type="button" className="btn" onClick={handleGoogle}>
          Continue with Google
        </button>
        {error && <p className="muted">{error}</p>}
      </form>
    </main>
  );
}
