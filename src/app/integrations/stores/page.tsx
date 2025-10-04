'use client';
import { useEffect, useState } from 'react';

export default function Stores(){
  const [stores, setStores] = useState<any[]>([]);
  useEffect(()=>{(async()=>{
    const r = await fetch('/api/stores/nearby'); const d = await r.json(); setStores(d.stores);
  })()},[]);
  return (
    <div className="panel">
      <h2>Nearby Indie Stores (Demo)</h2>
      {(stores||[]).length===0 && <div className="muted">No stores (stub). Plug in your data source.</div>}
      <ul>{stores.map((s:any)=>(<li key={s.id}>{s.name}</li>))}</ul>
    </div>
  )
}
