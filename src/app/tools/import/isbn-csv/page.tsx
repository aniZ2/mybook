'use client';

import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState } from 'react';

async function fetchMerged(isbn:string){
  const r = await fetch('/api/books/isbn?isbn='+encodeURIComponent(isbn));
  const data = await r.json();
  // Try to normalize a minimal book object
  const gItem = data.google?.items?.[0];
  const vol = gItem?.volumeInfo || {};
  const ol = data.openlibrary && data.openlibrary['ISBN:'+isbn];
  const title = vol.title || ol?.title || 'Untitled';
  const authors = vol.authors || (ol?.authors?.map((a:any)=>a.name) || []);
  const cover = vol.imageLinks?.thumbnail || (ol?.cover?.large || ol?.cover?.medium || ol?.cover?.small);
  return { title, authors, cover, isbn };
}

export default function ImportISBNCSV(){
  const [raw, setRaw] = useState('9780590353427\n9780590353403');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (s:string)=> setLog(l=>[...l, s]);

  const run = async ()=>{
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    setBusy(true); 
    setLog([]);
    const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    let i = 0;
    for (const line of lines){
      const isbn = line.replace(/[^0-9Xx]/g,'');
      try {
        const b = await fetchMerged(isbn);
        const bookId = (isbn || (b.title + '-' + (b.authors[0]||''))).replace(/\s+/g,'_');
        await setDoc(doc(db,'books', bookId), {
          title: b.title,
          authorId: (b.authors?.[0]||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
          coverUrl: b.cover || null,
          genres: [], 
          mood: [], 
          pacing: 'medium',
          meta: { isbn13: isbn }
        }, { merge: true });
        append(`✅ ${isbn} — ${b.title}`);
      } catch(e:any){
        append(`❌ ${isbn} — ${e.message||'error'}`);
      }
      i++;
    }
    setBusy(false);
  };

  return (
    <div className="panel">
      <h2>Batch Import — ISBN CSV</h2>
      <p className="muted">Paste a list of ISBNs (one per line). This will fetch metadata from Google Books + Open Library and write to Firestore.</p>
      <textarea className="input" style={{minHeight:160}} value={raw} onChange={e=>setRaw(e.target.value)} />
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? 'Importing…' : 'Import'}</button>
      <div style={{marginTop:'.6rem'}}>
        {log.map((l,i)=>(<div key={i}>{l}</div>))}
      </div>
    </div>
  )
}