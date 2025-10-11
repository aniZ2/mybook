'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // Adjust path to your AuthProvider

export default function AdminExports(){
  const { user } = useAuth(); // ✅ Get user from context
  const [collections, setCollections] = useState('books,clubs,authors,admin_audit');
  const [format, setFormat] = useState<'csv'|'ndjson'>('csv');
  const [result, setResult] = useState<any>(null);

  const run = async ()=>{
    if (!user) return alert('Sign in'); // ✅ Use user from context

    const tok = await user.getIdToken(true);
    const r = await fetch('/api/admin/exports', {
      method:'POST', 
      headers: { 
        'content-type':'application/json', 
        authorization: 'Bearer '+tok 
      },
      body: JSON.stringify({ 
        collections: collections.split(',').map(s=>s.trim()).filter(Boolean), 
        format 
      })
    });
    const j = await r.json();
    if (!r.ok) return alert('Error: '+(j.error||'unknown'));
    setResult(j);
  };

  const download = (col:string)=>{
    if (!result) return;
    const text = result.results[col] || '';
    const blob = new Blob([text], { type: format==='csv' ? 'text/csv' : 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `${col}.${format==='csv'?'csv':'ndjson'}`; 
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel">
      <h2>Admin • Exports</h2>
      <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
        <input 
          className="input" 
          value={collections} 
          onChange={e=>setCollections(e.target.value)} 
          style={{minWidth:360}} 
        />
        <select 
          className="input" 
          value={format} 
          onChange={e=>setFormat(e.target.value as any)}
        >
          <option value="csv">CSV</option>
          <option value="ndjson">NDJSON</option>
        </select>
        <button className="btn btn-primary" onClick={run}>Export</button>
      </div>
      {result && (
        <div style={{marginTop:'.6rem'}}>
          <div className="muted">Click to download each collection:</div>
          <ul>
            {Object.keys(result.results).map(col=>(
              <li key={col}>
                <button className="btn" onClick={()=>download(col)}>{col}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}