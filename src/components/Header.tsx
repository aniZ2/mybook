'use client';

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import styles from "./Header.module.css";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className={styles.nav}>
      {/* ───── Logo ───── */}
      <Link href="/" className={styles.logo}>
        Booklyverse
      </Link>

      {/* ───── Hamburger (mobile only) ───── */}
      <button
        className={styles.hamburger}
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span className={open ? styles.barActive : styles.bar}></span>
        <span className={open ? styles.barActive : styles.bar}></span>
        <span className={open ? styles.barActive : styles.bar}></span>
      </button>

      {/* ───── Desktop Links ───── */}
      <nav className={styles.linksDesktop}>
        <Link href="/discover">Discover</Link>
        <Link href="/clubs">Clubs</Link>
        <Link href="/authors">Authors</Link>
        <Link href="/deals">Deals</Link>

        {!loading && (
          <>
            {user ? (
              <>
                <Link href="/account">Account</Link>
                <button onClick={handleLogout} className={styles.signOutBtn}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/signup" className={styles.signupBtn}>Sign Up</Link>
              </>
            )}
          </>
        )}
      </nav>

      {/* ───── Mobile Menu ───── */}
      {open && (
        <div className={styles.mobileMenu}>
          <Link href="/discover" onClick={() => setOpen(false)}>Discover</Link>
          <Link href="/clubs" onClick={() => setOpen(false)}>Clubs</Link>
          <Link href="/authors" onClick={() => setOpen(false)}>Authors</Link>
          <Link href="/deals" onClick={() => setOpen(false)}>Deals</Link>

          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/account" onClick={() => setOpen(false)}>Account</Link>
                  <button onClick={handleLogout} className={styles.signOutBtn}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className={styles.signupBtn}>
                    Sign Up
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
