'use client';

import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function Events(){
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState('AMA with Author');
  const [type, setType] = useState('ama');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(()=>{
    if (!db) { // ✅ Add db check
      setError('Database not initialized');
      return;
    }

    try {
      const q = query(collection(db,'events'), orderBy('startsAt','desc'));
      const unsubscribe = onSnapshot(q, s=> {
        setEvents(s.docs.map(d=>({id:d.id, ...d.data()})));
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up events listener:', err);
      setError('Failed to load events');
    }
  },[]);

  const create = async ()=>{
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    if (!title.trim()) {
      alert('Please enter an event title');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db,'events'), { 
        title, 
        type, 
        startsAt: serverTimestamp(), 
        endsAt: null, 
        hostRef: null 
      });
      setTitle('AMA with Author'); // Reset form
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2>Events</h2>
      
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#b91c1c',
          padding: '.75rem',
          borderRadius: '4px',
          marginBottom: '.6rem'
        }}>
          {error}
        </div>
      )}

      <div style={{display:'flex', gap:'.6rem'}}>
        <input 
          className="input" 
          value={title} 
          onChange={e=>setTitle(e.target.value)}
          disabled={submitting}
          placeholder="Event title"
        />
        <select 
          className="input" 
          value={type} 
          onChange={e=>setType(e.target.value)}
          disabled={submitting}
        >
          <option value="ama">Author AMA</option>
          <option value="club_meet">Club Meeting</option>
          <option value="sprint">Sprint</option>
        </select>
        <button 
          className="btn btn-primary" 
          onClick={create}
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create'}
        </button>
      </div>

      <div style={{marginTop:'1rem'}}>
        {events.length === 0 ? (
          <p className="muted">No events yet. Create one above!</p>
        ) : (
          events.map(e=> (
            <div className="panel" key={e.id} style={{marginBottom:'.6rem'}}>
              <strong>{e.title}</strong> <span className="muted">({e.type})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}