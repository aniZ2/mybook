'use client';

export const dynamic = "force-dynamic"; 
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { logout } from "@/lib/auth";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to /login if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <p className="muted">Loading account…</p>;
  }

  if (!user) {
    // brief fallback in case redirect is happening
    return <p className="muted">Redirecting to login…</p>;
  }

  return (
    <main className="container">
      <h1 className="h1">Your Account</h1>
      <div className="panel" style={{ maxWidth: 500 }}>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>UID:</strong> {user.uid}</p>
        <p><strong>Display Name:</strong> {user.displayName || "Not set"}</p>
        <button
          className="btn"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Logout
        </button>
      </div>
    </main>
  );
}
