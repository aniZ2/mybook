'use client';
import { addDoc, collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ListPage(){
  const { id } = useParams<{id:string}>();
  const [list, setList] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [bookId, setBookId] = useState('');

  useEffect(()=>{(async()=>{
    const snap = await getDoc(doc(db,'lists', id));
    setList(snap.data());
    const unsub = onSnapshot(collection(db,'lists', id, 'items'), (s)=> setItems(s.docs.map(d=>({id:d.id, ...d.data()}))));
    return ()=>unsub();
  })()},[id]);

  const add = async (e:any)=>{
    e.preventDefault();
    if(!bookId) return;
    await addDoc(collection(db,'lists', id, 'items'), { bookId, note: '' });
    setBookId('');
  };

  if(!list) return <div className="panel">Loading...</div>;
  return (
    <div className="panel">
      <h2>{list.title}</h2>
      <form onSubmit={add} style={{display:'flex', gap:'.6rem'}}>
        <input className="input" value={bookId} onChange={e=>setBookId(e.target.value)} placeholder="Book ID to add" />
        <button className="btn btn-primary">Add</button>
      </form>
      <ul>
        {items.map(i=>(<li key={i.id}>{i.bookId}</li>))}
      </ul>
    </div>
  )
}
