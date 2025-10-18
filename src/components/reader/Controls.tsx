'use client';
import styles from './reader.module.css';

export default function Controls({
  progress,
  onPrev,
  onNext,
}: {
  progress: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.hud} role="toolbar" aria-label="Reader controls">
      <button className={styles.btn} onClick={onPrev} aria-label="Previous chapter">
        ◀
      </button>
      <div style={{ opacity: 0.8 }}>{progress}%</div>
      <button className={styles.btn} onClick={onNext} aria-label="Next chapter">
        ▶
      </button>
    </div>
  );
}
