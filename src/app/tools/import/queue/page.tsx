'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '@/context/AuthProvider'; // ✅ Import useAuth

export default function QueueImport(){
  const { user } = useAuth(); // ✅ Get user from context
  const [file, setFile] = useState<File|null>(null);
  const [jobId, setJobId] = useState<string|null>(null);
  const [job, setJob] = useState<any>(null);

  const start = async () => {
    if (!file) return;
    if (!storage || !db) {
      alert('Firebase not initialized');
      return;
    }

    const id = 'import_'+Date.now();
    const path = `imports/${id}.csv`;
    await uploadBytes(ref(storage, path), await file.arrayBuffer());
    
    const docRef = await addDoc(collection(db,'imports'), {
      createdAt: new Date(), 
      createdBy: user?.uid || null, // ✅ Use user from context
      path, 
      status: 'queued', 
      processed: 0, 
      total: 0, 
      errors: []
    });
    setJobId(docRef.id);
  };

  useEffect(()=>{
    if (!jobId || !db) return;
    const unsub = onSnapshot(doc(db,'imports', jobId), snap=> setJob(snap.data()));
    return ()=>unsub();
  }, [jobId]);

  return (
    <div className="panel">
      <h2>Queued Importer</h2>
      <p className="muted">Upload a CSV of ISBNs (optionally with headers: isbn,title,author,genres,mood,pacing). This runs in a background Cloud Function.</p>
      <input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <button className="btn btn-primary" onClick={start} disabled={!file}>Start Import</button>
      {job && (
        <div className="panel" style={{marginTop:'.6rem'}}>
          <div>Status: <strong>{job.status}</strong></div>
          <div>Progress: {job.processed}/{job.total}</div>
          {job.errors?.length ? <details><summary>Errors ({job.errors.length})</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(job.errors, null, 2)}</pre></details> : null}
        </div>
      )}
    </div>
  )
}