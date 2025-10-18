'use client';
import { useEffect, useMemo, useState } from 'react';

type Chapter = { href: string; title?: string };
type Manifest = { type: 'html' | 'epub'; chapters: Chapter[] };

export default function useReaderState(slug: string) {
  const [manifest, setManifest] = useState<Manifest>();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [offsetPct, setOffsetPct] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/books/${slug}/manifest.json`, { cache: 'no-store' });
      const m = (await res.json()) as Manifest;
      setManifest(m);
      setChapterIndex(0);
      setOffsetPct(0);
      setLoading(false);
    })();
  }, [slug]);

  const next = () =>
    setChapterIndex((i) => Math.min((manifest?.chapters.length ?? 1) - 1, i + 1));
  const prev = () => setChapterIndex((i) => Math.max(0, i - 1));

  const progress = useMemo(() => {
    if (!manifest) return 0;
    const n = manifest.chapters.length || 1;
    return Math.round(((chapterIndex / n) + (offsetPct / n)) * 100);
  }, [manifest, chapterIndex, offsetPct]);

  return { loading, manifest, chapterIndex, offsetPct, setOffsetPct, next, prev, progress };
}
