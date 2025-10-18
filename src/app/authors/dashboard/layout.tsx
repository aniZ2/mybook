'use client';

import { useAuth } from '@/context/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function AuthorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, userDoc } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/login');
      else if (!userDoc?.isAuthor) router.replace('/');
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <main className={styles.loadingContainer}>
        <p>Loading dashboard…</p>
      </main>
    );
  }

  if (!userDoc?.isAuthor) return null;

  const navLinks = [
    { label: 'Overview', path: '/authors/dashboard' },
    { label: 'My Books', path: '/authors/dashboard/books' },
    { label: 'Stats', path: '/authors/dashboard/stats' },
    { label: 'Settings', path: '/authors/dashboard/settings' },
  ];

  return (
    <main className={styles.dashboardShell}>
      {/* ═════════════ Sidebar ═════════════ */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h2 className={styles.logo}>✍️ Booklyverse</h2>
          <p className={styles.subtitle}>Author Portal</p>
        </div>

        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`${styles.navItem} ${
                pathname === link.path ? styles.active : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <footer className={styles.sidebarFooter}>
          <Link href="/" className={styles.backHome}>
            ← Back to Booklyverse
          </Link>
        </footer>
      </aside>

      {/* ═════════════ Main Content ═════════════ */}
      <section className={styles.mainContent}>{children}</section>
    </main>
  );
}
