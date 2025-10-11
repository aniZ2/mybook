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
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    if (!db) { // ✅ Add db check
      setError('Database not initialized');
      return;
    }

    (async()=>{
      try {
        const snap = await getDoc(doc(db,'lists', id));
        if (snap.exists()) {
          setList(snap.data());
        } else {
          setError('List not found');
          return;
        }

        const unsub = onSnapshot(collection(db,'lists', id, 'items'), (s)=> {
          setItems(s.docs.map(d=>({id:d.id, ...d.data()})));
        });
        
        return ()=>unsub();
      } catch (err) {
        console.error('Error loading list:', err);
        setError('Failed to load list');
      }
    })();
  },[id]);

  const add = async (e:any)=>{
    e.preventDefault();
    if (!bookId) return;
    if (!db) {
      alert('Database not initialized');
      return;
    }

    try {
      await addDoc(collection(db,'lists', id, 'items'), { bookId, note: '' });
      setBookId('');
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
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

  if (!list) {
    return <div className="panel">Loading...</div>;
  }

  return (
    <div className="panel">
      <h2>{list.title}</h2>
      <form onSubmit={add} style={{display:'flex', gap:'.6rem'}}>
        <input 
          className="input" 
          value={bookId} 
          onChange={e=>setBookId(e.target.value)} 
          placeholder="Book ID to add" 
        />
        <button className="btn btn-primary">Add</button>
      </form>
      <ul>
        {items.length === 0 ? (
          <li className="muted">No items in this list yet.</li>
        ) : (
          items.map(i=>(<li key={i.id}>{i.bookId}</li>))
        )}
      </ul>
    </div>
  );
}