'use client';

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  FirestoreDataConverter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

// ---- 1️⃣ Define the document shape -----------------
type Sprint = {
  id: string;
  type: string;
  duration: number;
  participants: string[];
  startsAt: Date | null; // serverTimestamp() may come back as Timestamp | null
};

// ---- 2️⃣ Converter to give Firestore strong typing --
const sprintConverter: FirestoreDataConverter<Sprint> = {
  toFirestore: (data) => {
    // you can safely return data because Firestore will validate it
    return data as FirebaseFirestore.DocumentData;
  },
  fromFirestore: (snap) =>
    ({ id: snap.id, ...snap.data() }) as Sprint,
};

export default function Sprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [duration, setDuration] = useState(20);

  // ---- 3️⃣ Load sprints from Firestore --------------
  useEffect(() => {
    if (!db) { // ✅ Add db check
      console.error('Firestore not initialized');
      return;
    }

    const q = query(
      collection(db, 'events').withConverter(sprintConverter),
      orderBy('startsAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snap) =>
      setSprints(
        snap.docs
          .map((d) => d.data())
          .filter((x) => x.type === 'sprint')
      )
    );

    return unsubscribe; // ✅ Return cleanup function
  }, []);

  // ---- 4️⃣ Create a new sprint ----------------------
  const create = async () => {
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    try {
      const d = await addDoc(collection(db, 'events'), {
        type: 'sprint',
        startsAt: serverTimestamp(),
        duration,
        participants: [],
      });
      alert('Sprint created: ' + d.id);
    } catch (error) {
      console.error('Error creating sprint:', error);
      alert('Failed to create sprint');
    }
  };

  // ---- 5️⃣ Join an existing sprint ------------------
  const join = async (id: string) => {
    if (!db) { // ✅ Add db check
      alert('Database not initialized');
      return;
    }

    try {
      await updateDoc(doc(db, 'events', id), {
        participants: arrayUnion('anon'),
      });
    } catch (error) {
      console.error('Error joining sprint:', error);
      alert('Failed to join sprint');
    }
  };

  // ---- 6️⃣ UI ---------------------------------------
  return (
    <div className="panel">
      <h2>Reading Sprints</h2>

      <div style={{ display: 'flex', gap: '.6rem' }}>
        <input
          className="input"
          style={{ width: 120 }}
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <button className="btn btn-primary" onClick={create}>
          Start Sprint
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {sprints.map((s) => (
          <div className="panel" key={s.id} style={{ marginBottom: '.6rem' }}>
            <strong>Sprint</strong> – duration {s.duration} min
            <div className="muted">
              Participants: {s.participants?.length || 0}
            </div>
            <button className="btn" onClick={() => join(s.id)}>
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}