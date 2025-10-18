'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/read/[slug]/Reader.module.css';

export default function HtmlRenderer({
  slug,
  chapter,
  offsetPct,
  onOffsetChange,
  onEnd,
}: {
  slug: string;
  chapter: { href: string; title?: string };
  offsetPct: number;
  onOffsetChange: (pct: number) => void;
  onEnd: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/books/${slug}/chapters/${chapter.href}`);
      const html = await res.text();
      if (!active || !contentRef.current) return;
      contentRef.current.innerHTML = html;
      const el = scroller.current!;
      const target = offsetPct * (el.scrollHeight - el.clientHeight);
      el.scrollTop = target;
    })();
    return () => { active = false; };
  }, [slug, chapter.href]);

  useEffect(() => {
    const el = scroller.current!;
    const onScroll = () => {
      const pct = Math.min(1, Math.max(0, el.scrollTop / (el.scrollHeight - el.clientHeight || 1)));
      onOffsetChange(pct);
      if (pct >= 0.999) onEnd();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onOffsetChange, onEnd]);

  return (
    <div className={styles.page} ref={scroller}>
      <article className={styles.content}>
        <div ref={contentRef} />
      </article>
    </div>
  );
}
