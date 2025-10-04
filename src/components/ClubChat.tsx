"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function ClubChat({ slug }: { slug: string }) {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "clubs", slug, "chat"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    await addDoc(collection(db, "clubs", slug, "chat"), {
      text: input,
      userName: user?.displayName || "Anonymous",
      userPhoto: user?.photoURL || null,
      userId: user?.uid || null,
      role: "member", // you can later replace with real role if needed
      createdAt: serverTimestamp(),
    });
    setInput("");
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        background: "white",
        display: "flex",
        flexDirection: "column",
        height: "500px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
          background: "#f9f9f9",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          Live Chat
        </h3>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.85rem",
            color: "#666",
          }}
        >
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#777",
            }}
          >
            No messages yet. Be the first to start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isCurrentUser = m.userId === user?.uid;
            const isAdmin = m.role === "admin";

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    background: isAdmin
                      ? "#fff8dc" // gold-ish for admin
                      : isCurrentUser
                      ? "#e6f0ff" // light blue for current user
                      : "#f1f1f1", // gray for others
                    textAlign: "left",
                    color: "#222",
                  }}
                >
                  {/* Username */}
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      marginBottom: "0.25rem",
                      color: isAdmin ? "#b38b00" : "#333",
                    }}
                  >
                    {m.userName || "Anonymous"} {isAdmin && "⭐"}
                  </div>

                  {/* Message text */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Timestamp */}
                  {m.createdAt && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "0.25rem",
                        color: "#777",
                        textAlign: "right",
                      }}
                    >
                      {new Date(m.createdAt.toDate()).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          padding: "0.75rem",
          borderTop: "1px solid #ddd",
          background: "#f9f9f9",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={user ? "Write a message..." : "Sign in to chat"}
          disabled={!user}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || !user}
          style={{
            marginLeft: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "none",
            background: "#4a4ae6",
            color: "white",
            fontWeight: 600,
            cursor:
              !input.trim() || !user ? "not-allowed" : "pointer",
            opacity: !input.trim() || !user ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
