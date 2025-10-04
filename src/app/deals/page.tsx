'use client';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function Deals() {
  const [deals, setDeals] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const snap = await getDocs(query(collection(db,'deals'), orderBy('endsAt','desc')));
    setDeals(snap.docs.map(d=>({id:d.id, ...d.data()})));
  })(); }, []);
  return (
    <div className="grid">
      <div className="panel col-12">
        <h2>Deals</h2>
        <div className="grid">
          {deals.map(d=>(
            <div key={d.id} className="panel col-6">
              <div><strong>{d.retailer?.toUpperCase()}</strong> — ${d.price} <span className="muted">ends {new Date(d.endsAt?.toDate?.() ?? d.endsAt).toLocaleString()}</span></div>
              <div className="muted">Book: {d.bookId}</div>
              <a className="btn" href={`/api/clickout?deal=${d.id}`}>Get Deal</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
