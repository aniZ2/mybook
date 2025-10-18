'use client';
import useReaderState from './useReaderState';
import HtmlRenderer from './HtmlRenderer';
import Controls from './Controls';
import ProgressBar from './ProgressBar';
import styles from './reader.module.css';

export default function ReaderShell({ slug }: { slug: string }) {
  const rs = useReaderState(slug);
  if (rs.loading || !rs.manifest)
    return <div className={styles.center}>Loading book…</div>;

  const chapter = rs.manifest.chapters[rs.chapterIndex];

  return (
    <div className={styles.reader}>
      <Controls
        progress={rs.progress}
        onPrev={rs.prev}
        onNext={() =>
          rs.offsetPct > 0.98
            ? rs.next()
            : rs.setOffsetPct(Math.min(1, rs.offsetPct + 0.1))
        }
      />
      <ProgressBar value={rs.progress} />
      <HtmlRenderer
        slug={slug}
        chapter={chapter}
        offsetPct={rs.offsetPct}
        onOffsetChange={rs.setOffsetPct}
        onEnd={rs.next}
      />
    </div>
  );
}
