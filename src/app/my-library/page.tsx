'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BookItem {
  id: string
  title: string
  authors: string[]
  savedAt?: any
}

export default function MyLibrary() {
  const [books, setBooks] = useState<BookItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) { // ✅ Add db check
      setError('Database not initialized')
      return
    }

    try {
      const q = query(
        collection(db, 'books'),         // or: 'users', user.uid, 'library'
        orderBy('savedAt', 'desc')
      )

      const unsub = onSnapshot(q, snap =>
        setBooks(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BookItem,'id'>) })))
      )
      
      return () => unsub()
    } catch (err) {
      console.error('Error setting up library listener:', err)
      setError('Failed to load library')
    }
  }, [])

  if (error) {
    return (
      <main className="grid">
        <h1 className="h1">My Library</h1>
        <div className="panel">
          <p className="muted">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="grid">
      <h1 className="h1">My Library</h1>
      {books.length === 0 ? (
        <div className="panel">
          <p className="muted">No books in your library yet.</p>
        </div>
      ) : (
        books.map(b => (
          <div key={b.id} className="panel col-6">
            <strong>{b.title}</strong>
            <div className="muted">{b.authors?.join(', ') || 'Unknown author'}</div>
          </div>
        ))
      )}
    </main>
  )
}