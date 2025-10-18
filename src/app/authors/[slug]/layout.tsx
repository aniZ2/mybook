'use client';

import { use } from 'react';
import Link from 'next/link';
import styles from './authors.module.css';

export default function AuthorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params); // ✅ unwrap the Promise

  const tabs = [
    { label: 'Overview', path: `/authors/${slug}` },
    { label: 'Books', path: `/authors/${slug}/books` },
    { label: 'Followers', path: `/authors/${slug}/followers` },
  ];

  return (
    <div className={styles.authorLayout}>
      <nav className={styles.subnav}>
        {tabs.map((tab) => (
          <Link key={tab.path} href={tab.path} className={styles.subnavLink}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className={styles.contentArea}>{children}</div>
    </div>
  );
}
