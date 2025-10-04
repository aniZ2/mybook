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
    const q = query(
      collection(db, 'events').withConverter(sprintConverter),
      orderBy('startsAt', 'desc')
    );
    return onSnapshot(q, (snap) =>
      setSprints(
        snap.docs
          .map((d) => d.data())
          .filter((x) => x.type === 'sprint')
      )
    );
  }, []);

  // ---- 4️⃣ Create a new sprint ----------------------
  const create = async () => {
    const d = await addDoc(collection(db, 'events'), {
      type: 'sprint',
      startsAt: serverTimestamp(),
      duration,
      participants: [],
    });
    alert('Sprint created: ' + d.id);
  };

  // ---- 5️⃣ Join an existing sprint ------------------
  const join = async (id: string) => {
    await updateDoc(doc(db, 'events', id), {
      participants: arrayUnion('anon'),
    });
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
