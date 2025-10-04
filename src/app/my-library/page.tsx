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

  useEffect(() => {
    const q = query(
      collection(db, 'books'),         // or: 'users', user.uid, 'library'
      orderBy('savedAt', 'desc')
    )

    const unsub = onSnapshot(q, snap =>
      setBooks(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BookItem,'id'>) })))
    )
    return () => unsub()
  }, [])

  return (
    <main className="grid">
      <h1 className="h1">My Library</h1>
      {books.map(b => (
        <div key={b.id} className="panel col-6">
          <strong>{b.title}</strong>
          <div className="muted">{b.authors.join(', ')}</div>
        </div>
      ))}
    </main>
  )
}
