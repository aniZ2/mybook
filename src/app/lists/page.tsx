'use client';

import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { getDbOrThrow } from '@/lib/firebase'; // ✅ safe Firestore getter
import { useEffect, useState } from 'react';

export default function Lists() {
  const [lists, setLists] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const db = getDbOrThrow(); // ✅ guarantees non-null Firestore
        const snap = await getDocs(collection(db, 'lists'));
        setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load lists:', err);
      }
    })();
  }, []);

  return (
    <div className="panel">
      <h2>Lists</h2>
      <Link className="btn btn-primary" href="/lists/new">
        Create a List
      </Link>
      <div style={{ marginTop: '.6rem' }}>
        {lists.map((l) => (
          <div className="panel" key={l.id} style={{ marginBottom: '.6rem' }}>
            <strong>
              <Link href={`/lists/${l.id}`}>{l.title}</Link>
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
