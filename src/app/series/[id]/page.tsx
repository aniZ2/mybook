'use client';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function SeriesPage(){
  const { id } = useParams<{id:string}>();
  const [series, setSeries] = useState<any>(null);
  const [nextMap, setNextMap] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    (async()=>{
      if (!db) { // ✅ Add db check
        setError('Database not initialized');
        return;
      }

      try {
        const snap = await getDoc(doc(db,'series', id));
        if (snap.exists()) {
          setSeries(snap.data());
        } else {
          setError('Series not found');
        }
      } catch (err) {
        console.error('Error fetching series:', err);
        setError('Failed to load series');
      }
    })();
  },[id]);

  const autofill = async ()=>{
    try {
      const res = await fetch('/api/series/autofill', {
        method:'POST', 
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ seriesId: id, books: series?.books||[] })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to autofill');
      }
      
      setNextMap(data.nextMap);
      alert('Computed nextMap for '+((series?.books||[]).length)+' items');
    } catch (err: any) {
      console.error('Error autofilling:', err);
      alert('Error: ' + (err.message || 'Failed to autofill'));
    }
  };

  if (error) {
    return (
      <div className="panel">
        <h2>Error</h2>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (!series) {
    return <div className="panel">Loading...</div>;
  }

  return (
    <div className="panel">
      <h2>{series.name}</h2>
      <ol>
        {(series.books||[]).sort((a:any,b:any)=>a.index-b.index).map((b:any)=>(
          <li key={b.bookId}>
            <Link href={`/books/${b.bookId}/chapters`}>{b.bookId}</Link> 
            <span className="muted"> #{b.index}</span>
          </li>
        ))}
      </ol>
      <button className="btn btn-primary" onClick={autofill}>
        Auto-populate next-in-series
      </button>
      {nextMap && (
        <pre style={{whiteSpace:'pre-wrap', marginTop:'.6rem'}}>
          {JSON.stringify(nextMap, null, 2)}
        </pre>
      )}
    </div>
  );
}