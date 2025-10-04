'use client';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function Lists(){
  const [lists, setLists] = useState<any[]>([]);
  useEffect(()=>{(async()=>{
    const snap = await getDocs(collection(db,'lists'));
    setLists(snap.docs.map(d=>({id:d.id, ...d.data()})));
  })()},[]);
  return (
    <div className="panel">
      <h2>Lists</h2>
      <Link className="btn btn-primary" href="/lists/new">Create a List</Link>
      <div style={{marginTop:'.6rem'}}>
        {lists.map(l=>(
          <div className="panel" key={l.id} style={{marginBottom:'.6rem'}}>
            <strong><Link href={`/lists/${l.id}`}>{l.title}</Link></strong>
          </div>
        ))}
      </div>
    </div>
  )
}
