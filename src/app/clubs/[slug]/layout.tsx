import Link from "next/link";
import styles from "../ClubsPage.module.css";

export default function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { slug } = params;

  return (
    <div className={styles.container}>
      {/* Club navigation */}
      <nav className={styles.nav}>
        <Link href={`/clubs/${slug}`} className={styles.link}>
          Overview
        </Link>
        <Link href={`/clubs/${slug}/books`} className={styles.link}>
          Books
        </Link>
        <Link href={`/clubs/${slug}/members`} className={styles.link}>
          Members
        </Link>
        <Link href={`/clubs/${slug}/chat`} className={styles.link}>
          Chat
        </Link>
      </nav>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
