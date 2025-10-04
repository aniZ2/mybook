// src/app/onboarding/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getDbOrThrow } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { formatError } from "@/lib/errors";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signup");
    }
  }, [user, loading, router]);

  async function handleRoleSelect(role: "reader" | "author") {
    if (!user) {
      setError("Please sign in to continue");
      router.push("/signup");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const db = getDbOrThrow();
      const ref = doc(db, "users", user.uid);

      console.log(`💾 Updating user ${user.uid} with role: ${role}`);

      await updateDoc(ref, {
        role,
        isAuthor: role === "author",
        profileComplete: true,
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Profile completed successfully!`);

      router.push("/account");
    } catch (err) {
      console.error("❌ Failed to save role:", err);
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

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="login-container">
      <div className="book-glow"></div>
      <div className="login-card">
        <h1 className="login-title">Welcome to Booklyverse! 🎉</h1>
        <p className="login-subtitle">Choose how you'll use the platform:</p>

        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
          Signed in as: <strong>{user.email}</strong>
        </p>

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexDirection: "column" }}>
          <button
            className="btn-primary btn"
            style={{ padding: "1.5rem", textAlign: "left" }}
            onClick={() => handleRoleSelect("reader")}
            disabled={isProcessing}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📚</div>
            <div style={{ fontWeight: "bold", fontSize: "1.125rem" }}>I'm a Reader</div>
            <div style={{ fontSize: "0.875rem", opacity: 0.8, marginTop: "0.25rem" }}>
              Discover and read amazing books
            </div>
          </button>
          
          <button
            className="btn-secondary btn"
            style={{ padding: "1.5rem", textAlign: "left" }}
            onClick={() => handleRoleSelect("author")}
            disabled={isProcessing}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✍️</div>
            <div style={{ fontWeight: "bold", fontSize: "1.125rem" }}>I'm an Author</div>
            <div style={{ fontSize: "0.875rem", opacity: 0.8, marginTop: "0.25rem" }}>
              Write and publish your stories
            </div>
          </button>
        </div>

        {isProcessing && (
          <p className="muted" style={{ marginTop: "1.5rem", textAlign: "center" }}>
            Saving your preference...
          </p>
        )}

        {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}
      </div>
    </main>
  );
}