'use client';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function Deals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    (async () => {
      if (!db) { // ✅ Add db check
        setError('Database not initialized');
        setLoading(false);
        return;
      }

      try {
        const snap = await getDocs(
          query(collection(db,'deals'), orderBy('endsAt','desc'))
        );
        setDeals(snap.docs.map(d=>({id:d.id, ...d.data()})));
      } catch (err) {
        console.error('Error loading deals:', err);
        setError('Failed to load deals');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="grid">
      <div className="panel col-12">
        <h2>Deals</h2>
        
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '.75rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p className="muted">Loading deals...</p>
        ) : deals.length === 0 ? (
          <p className="muted">No deals available at the moment. Check back soon!</p>
        ) : (
          <div className="grid">
            {deals.map(d=>(
              <div key={d.id} className="panel col-6">
                <div>
                  <strong>{d.retailer?.toUpperCase()}</strong> — ${d.price} 
                  <span className="muted"> ends {
                    new Date(d.endsAt?.toDate?.() ?? d.endsAt).toLocaleString()
                  }</span>
                </div>
                <div className="muted">Book: {d.bookId}</div>
                <a className="btn" href={`/api/clickout?deal=${d.id}`}>Get Deal</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}