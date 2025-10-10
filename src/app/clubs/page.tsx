import { Suspense } from "react";
import ClubsGrid from "@/components/ClubsGrid";
import ClubsLoading from "./loading";
import Link from "next/link";
import styles from "./ClubsPage.module.css";

export const metadata = {
  title: "Book Clubs",
  description: "Join book clubs and connect with readers who share your interests",
};

export default function ClubsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Book Clubs</h1>
          <p className={styles.subtitle}>
            Join communities of readers and discover your next great read together.
          </p>
        </div>

        <Link href="/clubs/create" className={styles.createBtn}>
          Create Club
        </Link>
      </div>

      <div className={styles.content}>
        <Suspense fallback={<ClubsLoading />}>
          <ClubsGrid />
        </Suspense>
      </div>
    </main>
  );
}
