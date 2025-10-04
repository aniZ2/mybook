// src/components/Header.tsx
'use client';

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="nav">
      <Link href="/" className="logo">Booklyverse</Link>
      <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link href="/discover">Discover</Link>
        <Link href="/clubs">Clubs</Link>
        <Link href="/authors">Authors</Link>
        <Link href="/deals">Deals</Link>
        
        {!loading && (
          <>
            {user ? (
              <>
                <Link href="/account">Account</Link>
                <button 
                  onClick={handleLogout}
                  className="btn"
                  style={{ 
                    background: "transparent", 
                    border: "1px solid currentColor",
                    cursor: "pointer"
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/signup" className="btn">Sign Up</Link>
              </>
            )}
          </>
        )}
      </nav>
    </header>
  );
}