'use client';
import { use, useEffect } from 'react';
import ReaderShell from '@/components/reader/ReaderShell';

export default function ReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params); // ✅ works in Next 15+ App Router

  // hide global scrollbars for immersive reading
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, []);

  return <ReaderShell slug={slug} />;
}
