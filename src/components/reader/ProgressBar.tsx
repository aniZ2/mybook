'use client';
import styles from '@/app/read/[slug]/Reader.module.css';

export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className={styles.progress} aria-hidden>
      <div className={styles.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}
