'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

type Report = { id:string; reason?:string; path?:string; uid?:string; createdAt?:any; resolved?:boolean };

export default function AdminMod(){
  const [items, setItems] = useState<Report[]>([]);

  const load = async ()=>{
    const user = auth.currentUser; if (!user) return alert('Sign in');
    const tok = await user.getIdToken(true);
    const r = await fetch('/api/mod/queue', { headers: { authorization: 'Bearer '+tok } });
    const j = await r.json();
    if (!r.ok) return alert('Error: '+(j.error||'unknown'));
    setItems(j.items||[]);
  };

  useEffect(()=>{ load(); },[]);

  const act = async (action:string, report:Report)=>{
    const user = auth.currentUser; if (!user) return alert('Sign in');
    const tok = await user.getIdToken(true);
    const body:any = { action, target: { reportId: report.id, path: report.path, uid: report.uid } };
    const r = await fetch('/api/mod/act', { method:'POST', headers: { 'content-type':'application/json', authorization: 'Bearer '+tok }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return alert('Error: '+(j.error||'unknown'));
    load();
  };

  return (
    <div className="panel">
      <h2>Admin • Moderation Queue</h2>
      <div className="muted" style={{marginBottom:'.6rem'}}>Review reports and take action.</div>
      {(items||[]).map(r => (
        <div key={r.id} className="panel" style={{marginBottom:'.6rem'}}>
          <div><strong>{r.reason || 'Report'}</strong></div>
          <div className="muted" style={{fontSize:12}}>path: {r.path || '—'} • user: {r.uid || '—'}</div>
          <div style={{display:'flex', gap:'.6rem', marginTop:'.4rem'}}>
            <button className="btn" onClick={()=>act('hide_post', r)} disabled={r.resolved}>Hide</button>
            <button className="btn" onClick={()=>act('delete_post', r)} disabled={r.resolved}>Delete</button>
            {r.uid && <button className="btn" onClick={()=>act('ban_user', r)} disabled={r.resolved}>Ban user</button>}
          </div>
        </div>
      ))}
    </div>
  )
}
