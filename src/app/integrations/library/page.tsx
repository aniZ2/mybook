'use client';

import { useState } from 'react';

export default function Library(){
  const [isbn, setIsbn] = useState('');
  const [status, setStatus] = useState<string|null>(null);
  const placeHold = async ()=>{
    const r = await fetch('/api/library/hold', { method:'POST', body: JSON.stringify({ isbn }) });
    setStatus('Requested hold: '+isbn+' (demo stub)');
  };
  return (
    <div className="panel">
      <h2>Library Hold (Demo)</h2>
      <div style={{display:'flex', gap:'.6rem'}}>
        <input className="input" value={isbn} onChange={e=>setIsbn(e.target.value)} placeholder="ISBN" />
        <button className="btn btn-primary" onClick={placeHold}>Place Hold</button>
      </div>
      {status && <div className="muted" style={{marginTop:'.6rem'}}>{status}</div>}
    </div>
  )
}
