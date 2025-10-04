'use client';
import { useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

type PreviewRow = {
  isbn: string;
  incoming: { title: string; author: string; cover?: string|null; genres: string[]; mood: string[]; pacing: string };
  existing: any | null;
  status: 'new'|'update'|'same'|'error';
  changes: Array<{ field: string; from: any; to: any }>;
  raw?: any;
  error?: string;
  selected: boolean;
  bookId: string;
};

function parseCSVLine(line: string){
  return line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
}

async function fetchMerged(isbn: string){
  const r = await fetch('/api/books/isbn?isbn='+encodeURIComponent(isbn));
  const data = await r.json();
  const gItem = data.google?.items?.[0];
  const vol = gItem?.volumeInfo || {};
  const ol = data.openlibrary && data.openlibrary['ISBN:'+isbn];
  const title = vol.title || ol?.title || 'Untitled';
  const authors = vol.authors || (ol?.authors?.map((a:any)=>a.name) || []);
  const cover = vol.imageLinks?.thumbnail || (ol?.cover?.large || ol?.cover?.medium || ol?.cover?.small) || null;
  return { title, author: authors?.[0] || 'unknown', cover };
}

function computeDiff(existing: any, incoming: any){
  const changes: any[] = [];
  if (!existing){
    ['title','authorId','coverUrl','genres','mood','pacing'].forEach(f=>{
      const toVal = f==='authorId' ? incoming.author : incoming[f];
      changes.push({ field: f, from: null, to: toVal });
    });
    return { status: 'new' as const, changes };
  }
  let same = true;
  const cmp = (field:string, from:any, to:any) => {
    const equal = JSON.stringify(from??null) === JSON.stringify(to??null);
    if (!equal){ changes.push({ field, from, to }); same = false; }
  };
  cmp('title', existing.title||'', incoming.title);
  cmp('authorId', existing.authorId||'', (incoming.author||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  cmp('coverUrl', existing.coverUrl||null, incoming.cover||null);
  cmp('genres', existing.genres||[], incoming.genres||[]);
  cmp('mood', existing.mood||[], incoming.mood||[]);
  cmp('pacing', existing.pacing||'medium', incoming.pacing||'medium');
  return { status: same ? 'same' as const : 'update' as const, changes };
}

export default function PreviewCSVImport(){
  const [raw, setRaw] = useState('isbn,title,author,genres,mood,pacing\n9780590353427,Harry Potter,J. K. Rowling,children;fantasy,cozy;whimsical,fast');
  const [rows, setRows] = useState<PreviewRow[]|null>(null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);

  const parseLines = () => raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

  const preview = async () => {
    setBusy(true);
    const lines = parseLines();
    const out: PreviewRow[] = [];
    let header: string[]|null = null;
    for (const line of lines){
      if (!header){
        const maybe = parseCSVLine(line).map(s=>s.toLowerCase());
        if (maybe.includes('isbn')){ header = maybe; continue; }
        header = null;
      }

      let isbn = '';
      let incoming: any = { title: '', author: '', cover: null, genres: [], mood: [], pacing: 'medium' };

      if (header){
        const cols = parseCSVLine(line);
        const map: Record<string,string> = {};
        header.forEach((h, i)=> map[h] = cols[i] || '');
        isbn = (map['isbn'] || '').replace(/[^0-9Xx]/g,'');
        incoming.title = map['title'] || '';
        incoming.author = map['author'] || '';
        incoming.genres = (map['genres'] || '').split(/;|\|/).map(s=>s.trim()).filter(Boolean);
        incoming.mood = (map['mood'] || '').split(/;|\|/).map(s=>s.trim()).filter(Boolean);
        incoming.pacing = (map['pacing'] || 'medium').toLowerCase();
        if (!incoming.title || !incoming.author){
          const looked = await fetchMerged(isbn);
          incoming.title = incoming.title || looked.title;
          incoming.author = incoming.author || looked.author;
          incoming.cover = looked.cover || null;
        }
      } else {
        isbn = line.replace(/[^0-9Xx]/g,'');
        const looked = await fetchMerged(isbn);
        incoming = { title: looked.title, author: looked.author, cover: looked.cover||null, genres: [], mood: [], pacing: 'medium' };
      }

      const bookId = (isbn || (incoming.title + '-' + (incoming.author||''))).replace(/\s+/g,'_');
      try {
        const snap = await getDoc(doc(db,'books', bookId));
        const existing = snap.exists() ? snap.data() : null;
        const diff = computeDiff(existing, incoming);
        out.push({
          isbn, incoming, existing, status: diff.status, changes: diff.changes,
          raw: { existing, incoming }, selected: diff.status !== 'same', bookId
        });
      } catch(e:any){
        out.push({ isbn, incoming, existing: null, status: 'error', changes: [], error: e.message||'error', selected: false, bookId });
      }
    }
    setRows(out);
    setBusy(false);
  };

  const selectedCount = useMemo(()=> (rows||[]).filter(r=>r.selected && (r.status==='new'||r.status==='update')).length, [rows]);

  const writeSelected = async ()=>{
    if(!rows) return;
    setWriting(true);

    // Audit "write" action before writes
    try {
      const u = auth.currentUser;
      const token = u ? await u.getIdToken(true) : null;
      await fetch('/api/imports/audit', {
        method:'POST',
        headers: { 'content-type':'application/json', ...(token ? { authorization: 'Bearer '+token } : {}) },
        body: JSON.stringify({
          kind: 'write_books',
          context: { source: 'isbn-csv/preview', selectedCount },
          rows: (rows||[]).filter(r=>r.selected).map(r=>({ isbn:r.isbn, status:r.status, changes:r.changes }))
        })
      });
    } catch {}

    for (const r of rows){
      if (!r.selected || (r.status!=='new' && r.status!=='update')) continue;
      await setDoc(doc(db,'books', r.bookId), {
        title: r.incoming.title,
        authorId: (r.incoming.author||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
        coverUrl: r.incoming.cover || null,
        genres: r.incoming.genres || [],
        mood: r.incoming.mood || [],
        pacing: r.incoming.pacing || 'medium',
        meta: { isbn13: r.isbn }
      }, { merge: true });
    }
    setWriting(false);
    alert('Wrote '+selectedCount+' item(s)');
  };

  const downloadDryRun = () => {
    if(!rows) return;
    const payload = rows.map(r => ({
      isbn: r.isbn,
      status: r.status,
      changes: r.changes,
      incoming: r.incoming,
      existingKeys: r.existing ? Object.keys(r.existing) : [],
      selected: r.selected,
      bookId: r.bookId
    }));
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows: payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-dry-run.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveDryRunToAudit = async () => {
    if(!rows) return;
    const u = auth.currentUser;
    const token = u ? await u.getIdToken(true) : null;
    await fetch('/api/imports/audit', {
      method:'POST',
      headers: { 'content-type':'application/json', ...(token ? { authorization: 'Bearer '+token } : {}) },
      body: JSON.stringify({
        kind: 'dry_run',
        context: { source: 'isbn-csv/preview' },
        rows: rows.map(r => ({ isbn:r.isbn, status:r.status, changes:r.changes }))
      })
    });
    alert('Saved dry run to admin_audit');
  };

  return (
    <div className="panel">
      <h2>Batch Import — CSV Preview (Diff before write)</h2>
      <p className="muted">Two modes: header CSV (<code>isbn,title,author,genres,mood,pacing</code>) or one ISBN per line.</p>
      <textarea className="input" style={{minHeight:160}} value={raw} onChange={e=>setRaw(e.target.value)} />
      <div style={{display:'flex', gap:'.6rem', marginTop:'.6rem', flexWrap:'wrap'}}>
        <button className="btn btn-primary" onClick={preview} disabled={busy}>{busy ? 'Loading…' : 'Preview'}</button>
        {rows && <button className="btn" onClick={downloadDryRun}>Download Dry Run (JSON)</button>}
        {rows && <button className="btn" onClick={saveDryRunToAudit}>Save Dry Run to Audit</button>}
      </div>

      {rows && (
        <div style={{marginTop:'1rem'}}>
          <div className="muted" style={{marginBottom:'.4rem'}}>Showing {rows.length} rows. Selected to write: {selectedCount}</div>
          <div style={{overflow:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left', borderBottom:'1px solid #1e2230'}}>Write</th>
                  <th style={{textAlign:'left', borderBottom:'1px solid #1e2230'}}>ISBN</th>
                  <th style={{textAlign:'left', borderBottom:'1px solid #1e2230'}}>Status</th>
                  <th style={{textAlign:'left', borderBottom:'1px solid #1e2230'}}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx)=>(
                  <tr key={r.isbn+'-'+idx} style={{borderBottom:'1px solid #1e2230'}}>
                    <td><input type="checkbox" checked={r.selected} onChange={e=>{
                      const next = [...(rows||[])]; next[idx] = { ...r, selected: e.target.checked }; setRows(next);
                    }} disabled={r.status==='same'||r.status==='error'} /></td>
                    <td>{r.isbn}</td>
                    <td>
                      {r.status==='new' && <span>🆕 new</span>}
                      {r.status==='update' && <span>✏️ update</span>}
                      {r.status==='same' && <span>✅ same</span>}
                      {r.status==='error' && <span>⚠️ error</span>}
                    </td>
                    <td>
                      {r.status==='error' && <span className="muted">{r.error}</span>}
                      {r.status!=='error' && (
                        <ul style={{margin:0, paddingLeft:'1rem'}}>
                          {r.changes.length===0 && <li className="muted">No changes</li>}
                          {r.changes.map((c,i)=>(
                            <li key={i}><strong>{c.field}</strong>: <span className="muted">{JSON.stringify(c.from)}</span> → {JSON.stringify(c.to)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{marginTop:'.6rem'}}>
            <button className="btn btn-primary" onClick={writeSelected} disabled={writing || selectedCount===0}>
              {writing ? 'Writing…' : `Write ${selectedCount} selected`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
