'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
};

export default function ClubChatPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    const messagesRef = collection(db, 'clubs', slug, 'chat');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(data);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsub();
  }, [slug]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const messagesRef = collection(db, 'clubs', slug, 'chat');
    await addDoc(messagesRef, {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || null,
      text: newMessage.trim(),
      createdAt: serverTimestamp(),
    });
    setNewMessage('');
  };

  return (
    <main className="container py-8 max-w-2xl mx-auto">
      <h1 className="h1 mb-4">Club Chat</h1>
      <div className="panel h-[60vh] overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3 items-start">
            {msg.userPhoto ? (
              <img
                src={msg.userPhoto}
                alt={msg.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                {msg.userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{msg.userName}</p>
              <p className="text-gray-700">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {user ? (
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      ) : (
        <p className="muted mt-4">Sign in to join the conversation.</p>
      )}
    </main>
  );
}
