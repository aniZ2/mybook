'use client';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewList(){
  const [title, setTitle] = useState('My Favorite Cozy Mysteries');
  const router = useRouter();
  const create = async (e:any)=>{
    e.preventDefault();
    const d = await addDoc(collection(db,'lists'), { title, visibility:'public', voters: [] });
    router.push('/lists/'+d.id);
  };
  return (
    <form onSubmit={create} className="panel">
      <h2>Create List</h2>
      <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
      <button className="btn btn-primary" style={{marginTop:'.6rem'}}>Create</button>
    </form>
  )
}
