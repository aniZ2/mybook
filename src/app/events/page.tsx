'use client';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function Events(){
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState('AMA with Author');
  const [type, setType] = useState('ama');

  useEffect(()=>{
    const q = query(collection(db,'events'), orderBy('startsAt','desc'));
    return onSnapshot(q, s=> setEvents(s.docs.map(d=>({id:d.id, ...d.data()}))));
  },[]);

  const create = async ()=>{
    await addDoc(collection(db,'events'), { title, type, startsAt: serverTimestamp(), endsAt: null, hostRef: null });
  };

  return (
    <div className="panel">
      <h2>Events</h2>
      <div style={{display:'flex', gap:'.6rem'}}>
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
        <select className="input" value={type} onChange={e=>setType(e.target.value)}>
          <option value="ama">Author AMA</option>
          <option value="club_meet">Club Meeting</option>
          <option value="sprint">Sprint</option>
        </select>
        <button className="btn btn-primary" onClick={create}>Create</button>
      </div>
      <div style={{marginTop:'1rem'}}>
        {events.map(e=> (
          <div className="panel" key={e.id} style={{marginBottom:'.6rem'}}>
            <strong>{e.title}</strong> <span className="muted">({e.type})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
