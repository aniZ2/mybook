'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function ModDetail({ params }: { params: { id: string } }){
  const { id } = params as any;
  const [item, setItem] = useState<any>(null);
  const [content, setContent] = useState<any>(null);

  useEffect(()=>{
    (async ()=>{
      const u = auth.currentUser; if (!u) return;
      const tok = await u.getIdToken(true);
      const r = await fetch('/api/mod/queue', { headers: { authorization: 'Bearer '+tok } });
      const j = await r.json();
      const it = (j.items||[]).find((x:any)=>x.id===id);
      setItem(it||null);

      if (it?.path){
        // fetch raw doc (admin-only helper)
        const rr = await fetch('/api/util/doc?path='+encodeURIComponent(it.path), { headers: { authorization: 'Bearer '+tok } });
        const jj = await rr.json();
        setContent(jj.doc||null);
      }
    })();
  }, [id]);

  if (!item) return <div className="panel">Loading…</div>;

  return (
    <div className="panel">
      <h2>Moderation • {id}</h2>
      <div className="muted">Reason: {item.reason}</div>
      <div className="muted">Path: {item.path || '—'}</div>
      {item.snapshot && <details><summary>Snapshot (reported)</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(item.snapshot, null, 2)}</pre></details>}
      {content && <details open><summary>Current content</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(content, null, 2)}</pre></details>}
      {!!(item.evidenceUrls||[]).length && (
        <div style={{marginTop:'.6rem'}}>
          <div className="muted">Evidence:</div>
          <ul>{item.evidenceUrls.map((u:string,i:number)=>(<li key={i}><a className="link" href={u} target="_blank">Attachment {i+1}</a></li>))}</ul>
        </div>
      )}
      <div style={{marginTop:'.6rem'}}>
        <Link className="btn" href="/admin/mod">Back to queue</Link>
      </div>
    </div>
  )
}
