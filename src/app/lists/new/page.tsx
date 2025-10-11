'use client';

import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewList(){
  const [title, setTitle] = useState('My Favorite Cozy Mysteries');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const create = async (e:any)=>{
    e.preventDefault();
    
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a list title');
      return;
    }

    setSubmitting(true);
    try {
      const d = await addDoc(collection(db,'lists'), { 
        title, 
        visibility:'public', 
        voters: [] 
      });
      router.push('/lists/'+d.id);
    } catch (err) {
      console.error('Error creating list:', err);
      alert('Failed to create list. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={create} className="panel">
      <h2>Create List</h2>
      <input 
        className="input" 
        value={title} 
        onChange={e=>setTitle(e.target.value)}
        disabled={submitting}
        placeholder="Enter list title"
      />
      <button 
        className="btn btn-primary" 
        style={{marginTop:'.6rem'}}
        disabled={submitting}
      >
        {submitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}